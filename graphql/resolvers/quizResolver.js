const { GraphQLError } = require("graphql");
const Quiz = require("../../models/Quiz");
const Category = require("../../models/Category");
const Result = require("../../models/Result");
const CreatorStats = require("../../models/CreatorStats");
const PlayerStats = require("../../models/PlayerStats");
const QuizStats = require("../../models/quizStats");
const Reaction = require("../../models/QuizReaction");
const Comment = require("../../models/Comment");
const CommentReaction = require("../../models/CommentReaction");
const User = require("../../models/User");
const { default: mongoose } = require("mongoose");
const Request = require("../../models/Request");
const Achievement = require("../../models/Achievement");
const { notificationFunctions } = require("./notificationResolver");

const PASSING_PERCENTACE = 0.33;
const COMMENTS_PER_PAGE = 10;
const QUIZ_PER_PAGE = 15;
const MAX_NOTIFICATION_LENGTH = 10;

const quizResolver = {
  Query: {
    async getQuiz(_, { id }, { req }) {
      try {
        const quiz = await Quiz.findById(id)
          .populate("categoryId", "_id title")
          .populate("creatorId", "_id username");
        if (!quiz) {
          throw new GraphQLError("Quiz not found!", {
            extensions: { code: 404 },
          });
        }

        let comments = await Comment.find({ quizId: id, parentCommentId: null })
          .limit(COMMENTS_PER_PAGE)
          .sort({ createdAt: -1 })
          .populate("userId", "_id username profilePicture")
          .lean();

        comments.forEach((comment) => {
          if (comment.mentions.length != 0) {
            comment.text = helperFunctions.formatText(
              comment.text,
              comment.mentions
            );
          }
        });

        let user;
        if (req.isAuth) {
          user = await User.findById(req.userId);
          if (user) {
            const reaction = await Reaction.findOne({
              quizId: id,
              userId: req.userId,
            });
            quiz.reaction = reaction ? reaction.reaction : null;

            const quizResult = await Result.findOne({
              userId: req.userId,
              quizId: id,
            });
            quiz.isAttempted = Boolean(quizResult);
            if (quizResult) {
              quiz.resultId = quizResult._id;
            }

            const userReactions = await CommentReaction.find({
              userId: req.userId,
              commentId: { $in: comments.map((c) => c._id) },
            });

            const commentsWithReaction = comments.map((comment) => {
              const userReaction = userReactions.find(
                (ur) => ur.commentId.toString() === comment._id.toString()
              );

              return {
                ...comment,
                reaction: userReaction ? userReaction.reaction : null,
              };
            });

            comments = commentsWithReaction;
          }
        }

        if (!user || user._id.toString() !== quiz.creatorId.toString()) {
          quiz.questions.forEach((que) => {
            que.options.forEach((opt) => {
              delete opt.isCorrect;
            });
          });
        }
        quiz.comments = comments;
        return quiz;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async getAllQuizzes(_, { filterInput }, { req }) {
      try {
        if (req.role === "creator") {
          filterInput.creatorId = req.userId;
        } else {
          filterInput.quizStatus = "accepted";
        }

        let pageRequested;
        if (filterInput.page) {
          pageRequested = filterInput.page;
          delete filterInput.page;
        }

        let quizzes = await Quiz.find(filterInput)
          .skip((pageRequested - 1) * QUIZ_PER_PAGE)
          .sort({ createdAt: -1 })
          .limit(QUIZ_PER_PAGE);
        if (req.role === "creator") {
          quizzes = quizzes.map((quiz) => {
            let acceptanceRate;
            if (quiz.meta.passed === 0) {
              acceptanceRate = quiz.meta.attempted === 0 ? "NA" : "0%";
            } else {
              acceptanceRate =
                ((quiz.meta.passed / quiz.meta.attempted) * 100).toFixed(2) +
                "%";
            }

            quiz.meta.acceptanceRate = acceptanceRate;
            return quiz;
          });
          return quizzes;
        }

        const playerStats = req.isAuth
          ? await PlayerStats.findOne({ userId: req.userId })
          : undefined;
        if (playerStats) {
          const playerQuizzes = playerStats.quizzes.map((q) => q.toString());
          quizzes.forEach((quiz) => {
            if (playerQuizzes.includes(quiz._id.toString())) {
              quiz.isAttempted = true;
            }
          });
        }
        return quizzes;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async getCreatorQuizzes(_, { filterInput }, { req }) {
      try {
        const user = await User.findById(req.userId);
        if (user) {
          if (user._id.toString() !== req.userId.toString()) {
            filterInput.quizStatus = "accepted";
          }
        }
        let page;
        if (filterInput.page) {
          page = filterInput.page;
          delete filterInput.page;
        }
        let quizzes = await Quiz.find(filterInput)
          .skip((page - 1) * QUIZ_PER_PAGE)
          .sort({ createdAt: -1 })
          .limit(QUIZ_PER_PAGE);

        return quizzes;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async getQuizStats() {
      const quizStats = await QuizStats.findById("global_stats");
      return quizStats.difficulty;
    },

    async canQuizBeUpdated(_, { id }, { req }) {
      try {
        const quiz = await Quiz.findById(id);
        if (!quiz || quiz.creatorId.toString() != req.userId.toString()) {
          const error = new Error("Quiz not found!");
          error.statusCode = 404;
          throw error;
        }
        return { Success: quiz.meta.attempted > 0 ? false : true };
      } catch (err) {
        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },
  },

  Mutation: {
    async createQuiz(_, { quizInput }, { req }) {
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
        if (user.role !== "creator") {
          throw new GraphQLError("Not Authorized!", {
            extensions: { code: 403 },
          });
        }

        let type = ["new quiz"];

        let category;
        if (mongoose.Types.ObjectId.isValid(quizInput.categoryId)) {
          category = await Category.findById(quizInput.categoryId);
        }
        if (!category) {
          type.push("new category");
          category = await helperFunctions.createCategory(
            quizInput.categoryId,
            req.userId
          );
          quizInput.categoryId = category._id;
        }

        const quiz = new Quiz({
          categoryId: quizInput.categoryId,
          creatorId: req.userId,
          description: quizInput.description,
          difficulty: quizInput.difficulty,
          quizStatus: "pending",
          questionCount: quizInput.questions.length,
          questions: quizInput.questions,
          title: quizInput.title,
          totalPoints: quizInput.questions.reduce((prev, cur) => {
            return prev + cur.point;
          }, 0),
        });

        const savedQuiz = await quiz.save();
        category.quizzes.push(savedQuiz._id);
        // category.meta[quizInput.difficulty]++;
        await category.save();

        let creatorStat = await CreatorStats.findOne({ userId: req.userId });
        if (!creatorStat) {
          creatorStat = new CreatorStats({
            userId: req.userId,
          });
          await creatorStat.save();
        }
        creatorStat.pending[quizInput.difficulty]++;

        let creatorCategory = creatorStat.category.find(
          (c) => c.categoryId.toString() === quizInput.categoryId.toString()
        );

        if (!creatorCategory) {
          creatorStat.category.push({
            categoryId: quizInput.categoryId,
            pending: {
              [quizInput.difficulty]: 1,
            },
          });
        } else {
          creatorCategory.pending[quizInput.difficulty]++;
        }
        await creatorStat.save();

        const message = quizInput.note
          ? [
              {
                userId: req.userId,
                message: quizInput.note,
              },
            ]
          : [];

        const request = new Request({
          quizId: savedQuiz._id,
          creatorId: req.userId,
          conversation: message,
          messageCount: message.length > 0 ? 1 : 0,
          status: "pending",
          type: type,
        });

        await request.save();

        return savedQuiz._id;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async updateQuiz(_, { quizInput }, { req }) {
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
        if (user.role !== "creator") {
          throw new GraphQLError("Not Authorized!", {
            extensions: { code: 403 },
          });
        }

        const quiz = await Quiz.findById(quizInput._id);
        if (!quiz) {
          const error = new Error("Quiz not found!");
          error.statusCode = 404;
          throw error;
        }
        const prevQuizStatus = quiz.quizStatus;

        quiz.creatorId = req.userId;
        quiz.description = quizInput.description;
        quiz.title = quizInput.title;
        quiz.quizStatus = "pending";

        const canUpdate = quiz.meta.attempted <= 0;
        if (canUpdate) {
          quiz.questionCount = quizInput.questions.length;
          quiz.questions = quizInput.questions;
          quiz.totalPoints = quizInput.questions.reduce((prev, cur) => {
            return prev + cur.point;
          }, 0);
        }

        const savedQuiz = await quiz.save();

        const creatorStat = await CreatorStats.findOne({ userId: req.userId });
        creatorStat.pending[quizInput.difficulty]++;
        creatorStat[prevQuizStatus][quizInput.difficulty]--;
        const creatorCategory = creatorStat.category.find(
          (c) => c.categoryId.toString() === quizInput.categoryId.toString()
        );
        creatorCategory.pending[quizInput.difficulty]++;
        creatorCategory[prevQuizStatus][quizInput.difficulty]--;
        await creatorStat.save();

        const message = quizInput.note
          ? {
              userId: req.userId,
              message: quizInput.note,
            }
          : undefined;

        const request = await Request.findOne({ quizId: quizInput._id });
        if (request.status === "accepted") {
          request.type = ["edit quiz"];
        }
        request.status = "pending";

        if (message) {
          request.messageCount++;
          request.conversation.push(message);
        }
        await request.save();

        return savedQuiz._id;
      } catch (err) {
        console.log(err);

        throw new GraphQLError(err.message, {
          extensions: { code: err.statusCode || 500 },
        });
      }
    },

    async updateQuizPublicationStatus(_, { quizId, status }, { req }) {
      try {
        const user = await User.findById(req.userId);
        if (!user || user.role !== "admin") {
          const error = new Error("Not Authorized");
          error.statusCode = 403;
          throw error;
        }

        const quiz = await Quiz.findById(quizId);
        const creatorStats = await CreatorStats.findOne({
          userId: quiz.creatorId,
        });
        if (!quiz) {
          const error = new Error("Quiz not found!");
          error.statusCode = 404;
          throw error;
        }

        if (status) {
          quiz.isEnabled = true;
          await quiz.save();
          const category = await Category.findById(quiz.categoryId);
          if (!category) {
            const error = new Error("Category not found!");
            error.statusCode = 404;
            throw error;
          }
          category.isActive = status;
          category.meta[quiz.difficulty]++;
          await category.save();

          const quizStats = await QuizStats.findById("global_stats");
          quizStats.totalQuizzes++;
          quizStats.difficulty[quiz.difficulty]++;
          await quizStats.save();
        }

        creatorStats.pending[quiz.difficulty]--;
        creatorStats[status ? "accepted" : "rejected"][quiz.difficulty]++;
        await creatorStats.save();

        return { Success: true };
      } catch (err) {
        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async submitQuiz(_, { submitionInput }, { req }) {
      const { quizId, userAnswers } = submitionInput;
      let score = 0;
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

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
          throw new GraphQLError("Quiz Not Found!", {
            extensions: { code: 404 },
          });
        }

        userAnswers.forEach(({ questionId, optionId }) => {
          const question = quiz.questions.find(
            (q) => q._id.toString() === questionId.toString()
          );
          const correctOption = question.options.find((op) => op.isCorrect);
          if (correctOption._id.toString() === optionId) {
            score += question.point;
          }
        });

        const status =
          score >= quiz.totalPoints * PASSING_PERCENTACE ? "passed" : "failed";

        quiz.meta.attempted++;
        if (status === "passed") {
          quiz.meta.passed++;
        }

        await quiz.save();

        let result = await Result.findOne({
          quizId,
          userId: req.userId,
        });

        if (result) {
          result.score = score;
          result.userAnswers = userAnswers;
          status = result.status;
        } else {
          result = new Result({
            quizId: quiz._id,
            score,
            status,
            userAnswers,
            userId: req.userId,
          });
        }

        const savedResult = await result.save();

        if (status !== "previewed") {
          let playerStats = await PlayerStats.findOne({ userId: req.userId });
          if (!playerStats) {
            playerStats = new PlayerStats({
              userId: req.userId,
            });
          }
          let totalAttempted = 0;
          ["easy", "medium", "hard"].forEach((dif) => {
            totalAttempted += playerStats.attempted[dif];
          });

          const allAchievements = await Achievement.find().lean();
          const unlockedAchievement = allAchievements.find(
            (ach) => ach.quizToComplete === totalAttempted + 1
          );

          if (unlockedAchievement) {
            user.achievements.push({
              achievementId: unlockedAchievement._id,
            });

            const notification = await notificationFunctions.createNotification(
              user._id,
              `Achievement unlocked!\n ${
                unlockedAchievement.title +
                " - " +
                unlockedAchievement.quizToComplete +
                " quiz completed"
              }`,
              "achievement",
              `/profile/${user.username}`
            );

            const updatedNotification = [notification, ...user.notifications];
            if (updatedNotification.length > MAX_NOTIFICATION_LENGTH) {
              user.notifications = updatedNotification.slice(
                0,
                MAX_NOTIFICATION_LENGTH
              );
            } else {
              user.notifications = updatedNotification;
            }
            await user.save();
          }

          playerStats.quizzes.push(quiz._id);
          let playerStatCategory = playerStats.category.find(
            (c) => c._id.toString() === quiz.categoryId.toString()
          );

          if (!playerStatCategory) {
            playerStats.category.push({
              categoryId: quiz.categoryId,
              attempted: {
                [quiz.difficulty]: 1,
              },
              quizzes: [quiz._id],
              passed: {
                [quiz.difficulty]: status === "passed" ? 1 : 0,
              },
            });
          } else {
            playerStatCategory.attempted[quiz.difficulty]++;
            playerStatCategory.quizzes.push(quiz._id);
            if (status === "passed") {
              playerStatCategory.passed[quiz.difficulty]++;
            }
          }

          playerStats.attempted[quiz.difficulty]++;
          if (status === "passed") {
            playerStats.passed[quiz.difficulty]++;
          }
          await playerStats.save();
        }

        return savedResult._id;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async updateQuizReaction(_, { quizId, userReaction }, { req }) {
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

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
          throw new GraphQLError("Quiz Not Found!", {
            extensions: { code: 404 },
          });
        }

        let reaction = await Reaction.findOne({ quizId, userId: req.userId });
        if (reaction) {
          if (reaction.reaction === userReaction) {
            await Reaction.findByIdAndDelete(reaction._id);
            quiz.meta[userReaction]--;
          } else {
            quiz.meta[reaction.reaction]--;
            quiz.meta[userReaction]++;
            reaction.reaction = userReaction;
            await reaction.save();
          }
        } else {
          reaction = new Reaction({
            quizId,
            userId: req.userId,
            reaction: userReaction,
          });
          quiz.meta[userReaction]++;
          await reaction.save();
        }

        await quiz.save();

        return { Success: true };
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },
  },
};

const helperFunctions = {
  async createCategory(title, creatorId) {
    const category = new Category({
      creatorId,
      isActive: false,
      title,
    });

    const savedCategory = await category.save();
    return savedCategory;
  },

  formatText(text, mentions) {
    let formattedText = text;
    for (const mention of mentions) {
      const mentionTag = `@${mention.username}`;
      formattedText = formattedText.replace(
        new RegExp(`@${mention.username}`, "g"),
        `<a href="/profile/${mention.userId}" class="mention">${mentionTag}</a>`
      );
    }

    return formattedText;
  },
};

module.exports = quizResolver;
