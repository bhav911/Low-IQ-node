const { GraphQLError } = require("graphql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../../models/User");
const Result = require("../../models/Result");
const QuizStats = require("../../models/quizStats");
const CreatorStats = require("../../models/CreatorStats");
const PlayerStats = require("../../models/PlayerStats");
const Quiz = require("../../models/Quiz");
const Achievement = require("../../models/Achievement");
const Notification = require("../../models/Notification");
const { notificationFunctions } = require("./notificationResolver");

const QUIZ_PER_PAGE = 15;

const userResolver = {
  Query: {
    async getUser(_, __, { req }) {
      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("User Not Found!", {
            extensions: { code: 404 },
          });
        }

        return user;
      } catch (err) {
        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async fetchProfile(_, { username }, { req }) {
      try {
        let loggedUser;
        if (req.isAuth) {
          loggedUser = await User.findById(req.userId);
        }

        const user = await User.findOne({ username: username })
          .populate("achievements.achievementId")
          .lean();

        if (!user) {
          return null;
        }

        const allAchievements = await Achievement.find()
          .sort({ quizToComplete: 1 })
          .lean();
        const userAchievements = [...(user.achievements ?? [])];
        const userAchievementsIds = new Map(
          userAchievements.map((ach) => [
            ach.achievementId._id.toString(),
            {
              createdAt: ach.createdAt,
              claimedOn: ach.claimedOn,
            },
          ])
        );

        const populatedAchievements = allAchievements.map((ach) => {
          return {
            ...ach,
            isUnlocked: userAchievementsIds.has(ach._id.toString()),
            meta: userAchievementsIds.get(ach._id.toString()),
          };
        });

        user.achievements = populatedAchievements;

        let profileObject = {
          user: user,
        };

        const quizStats = await QuizStats.findById("global_stats");
        profileObject.quizStats = quizStats.difficulty;

        if (user.role === "creator") {
          const filter =
            loggedUser && loggedUser._id.toString() === user._id.toString()
              ? {}
              : { quizStatus: "accepted" };
          const quizzes = await Quiz.find({ creatorId: user._id, ...filter })
            .limit(QUIZ_PER_PAGE)
            .sort({ createdAt: -1 })
            .lean();
          profileObject.creations = quizzes;

          const creatorStats = await CreatorStats.findOne({ userId: user._id });
          profileObject.creatorStats = creatorStats;
        } else {
          const submissions = await Result.find({ userId: user._id })
            .limit(QUIZ_PER_PAGE)
            .sort({ createdAt: -1 })
            .populate("quizId", "title difficulty")
            .lean();
          profileObject.submissions = submissions;

          const playerStats = await PlayerStats.findOne({ userId: user._id });
          profileObject.playerStats = playerStats;
        }

        return { ...profileObject };
      } catch (err) {
        console.log(err);

        throw new GraphQLError(err.messae, {
          extensions: { code: err.code || 500 },
        });
      }
    },

    async loginUser(_, { email, password }) {
      const user = await User.findOne({ email });
      if (!user) {
        throw new GraphQLError("Invalid Username or Password!", {
          extensions: { code: 401 },
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new GraphQLError("Invalid Username or Password!", {
          extensions: { code: 401 },
        });
      } else {
        const token = jwt.sign(
          {
            userId: user._id,
            username: user.username,
            role: user.role,
          },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "30d",
          }
        );

        return {
          token,
          userId: user._id,
          username: user.username,
          role: user.role,
          profilePicture: {
            link: user.profilePicture.link,
          },
          notifications: user.notifications || [],
        };
      }
    },

    async authStatus(_, __, { req }) {
      if (!req.isAuth) {
        return null;
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return null;
      }
      const token = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "30d",
        }
      );

      return {
        token,
        userId: user._id,
        username: user.username,
        role: user.role,
        profilePicture: {
          link: user.profilePicture.link,
        },
        notifications: user.notifications || [],
      };
    },

    async validateToken(_, { token }) {
      try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await User.findById(decodedToken.userId).lean();

        if (!user) return null;

        return {
          token,
          userId: user._id,
          username: user.username,
          role: user.role,
          profilePicture: user.profilePicture
            ? { link: user.profilePicture.link }
            : null,
          notifications: user.notifications || [],
        };
      } catch (err) {
        if (
          err.name === "JsonWebTokenError" ||
          err.name === "TokenExpiredError"
        ) {
          return null;
        }
        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async checkIfUsernameIsTaken(_, { username }) {
      try {
        const user = await User.findOne({ username });
        return { isTaken: Boolean(user) };
      } catch (err) {
        throw new GraphQLError("Failed to check username availability", {
          extensions: { code: 500 },
        });
      }
    },
  },

  Mutation: {
    async createUser(_, { userInput }) {
      try {
        const user = await User.findOne({ email: userInput.email });
        if (user) {
          throw new GraphQLError("Email already registered! try Sign-In", {
            extensions: { code: 402 },
          });
        }
        const hashedPwd = await bcrypt.hash(userInput.password, 12);

        const newUser = new User({
          email: userInput.email,
          username: userInput.username,
          password: hashedPwd,
          role: userInput.role,
        });

        const savedUser = await newUser.save();

        const registrationNotification =
          await notificationFunctions.createNotification(
            savedUser._id.toString(),
            "Great to see you here! Finish setting up your profile.",
            "system",
            "/profile"
          );

        savedUser.notifications.push(registrationNotification);
        await savedUser.save();

        const token = jwt.sign(
          {
            userId: savedUser._id,
            username: savedUser.username,
            role: savedUser.role,
          },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "30d",
          }
        );

        return {
          token,
          userId: savedUser._id,
          username: savedUser.username,
          role: savedUser.role,
          profilePicture: {
            link: savedUser.profilePicture.link,
          },
          notifications: savedUser.notifications || [],
        };
      } catch (err) {
        console.log(err);
        throw err;
      }
    },

    async updateUser(_, { field, value }, { req }) {
      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("Something went wrong!", {
            extensions: { code: 404 },
          });
        }

        user[field] = value;
        await user.save();
        return { Success: true };
      } catch (err) {
        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async updateEmail(_, { email, password }, { req }) {
      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }
      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("User Not Found!", {
            extensions: { code: 404 },
          });
        }

        if (user.email === email) {
          throw new GraphQLError("Please provide a diffrent email address!", {
            extensions: { code: 403 },
          });
        }

        const exisitingUser = await User.findOne({ email });
        if (exisitingUser) {
          throw new GraphQLError(
            "The Provided Email Address is already Taken !",
            {
              extensions: { code: 403 },
            }
          );
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          throw new GraphQLError("Invalid Password!", {
            extensions: { code: 401 },
          });
        } else {
          user.email = email;
          user.emailVerified = false;
          await user.save();

          return { Success: true };
        }
      } catch (err) {
        console.log(err);

        throw new GraphQLError(err.message, {
          extensions: { code: err.extensions.code || 500 },
        });
      }
    },

    async updateUsername(_, { username }, { req }) {
      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("Something went wrong!", {
            extensions: { code: 404 },
          });
        }

        user.username = username;
        await user.save();
        return { Success: true };
      } catch (err) {
        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async updatePassword(_, { currentPassword, newPassword }, { req }) {
      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("Something went wrong!", {
            extensions: { code: 404 },
          });
        }

        const doesPasswordMatch = await bcrypt.compare(
          currentPassword,
          user.password
        );

        if (!doesPasswordMatch) {
          throw new GraphQLError("Incorrect correct password!", {
            extensions: { code: 401 },
          });
        }

        const hashedPwd = await bcrypt.hash(newPassword, 12);

        user.password = hashedPwd;
        await user.save();

        return { Success: true };
      } catch (err) {
        throw new GraphQLError(err.message, {
          extensions: { code: err.extensions.code || 500 },
        });
      }
    },

    async resetPassword(_, { resetPasswordInput }) {
      const userId = resetPasswordInput.userId;
      const password = resetPasswordInput.password;
      const token = resetPasswordInput.token;

      try {
        const user = await User.findOne({
          _id: userId,
          resetPasswordToken: token,
          resetPasswordTokenExpiration: { $gt: Date.now() },
        });

        if (!user) {
          throw new GraphQLError("Invalid request, Please try again!", {
            extensions: { code: 401 },
          });
        }

        const hashedPwd = await bcrypt.hash(password, 12);
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
          throw new GraphQLError(
            "Create a new password which you haven't used before!",
            {
              extensions: { code: 422 },
            }
          );
        }

        user.password = hashedPwd;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpiration = undefined;
        await user.save();

        return { Success: true };
      } catch (err) {
        console.log(err);

        throw new GraphQLError(err.message, {
          extensions: { code: err.extensions.code || 500 },
        });
      }
    },
  },
};

module.exports = userResolver;
