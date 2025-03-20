const { GraphQLError } = require("graphql");

const Result = require("../../models/Result");
const User = require("../../models/User");
const Quiz = require("../../models/Quiz");
const PlayerStats = require("../../models/PlayerStats");

const resultResolver = {
  Query: {
    async getResult(_, { resultId }, { req }) {
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

        const result = await Result.findById(resultId)
          .populate("userId", "_id username")
          .populate({
            path: "quizId",
            select:
              "_id title description difficulty questionCount categoryId questions totalPoints",
            populate: {
              path: "categoryId",
              select: "_id title",
            },
          });

        if (!result) {
          throw new GraphQLError("Result Not Found!", {
            extensions: { code: 404 },
          });
        }

        const currentUserResult = await Result.findOne({
          userId: req.userId,
          quizId: result.quizId._id,
        });

        if (!currentUserResult) {
          throw new GraphQLError("Not Authorized!", {
            extensions: { code: 403 },
          });
        }

        return result;
      } catch (err) {
        console.log(err);

        throw new GraphQLError(err.message, {
          extensions: { code: err.extensions.code || 500 },
        });
      }
    },

    async canProceedToResult(_, { resultId }, { req }) {
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

        const currentResult = await Result.findById(resultId);
        const userResult = await Result.findOne({
          quizId: currentResult.quizId,
          userId: user._id,
        });

        return { Success: Boolean(userResult), resultId: currentResult.quizId };
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async getSubmissions(_, { userId, page }) {
      const QUIZ_PER_PAGE = 15;
      try {
        const submissions = await Result.find({ userId })
          .populate("quizId", "title difficulty")
          .skip((page - 1) * QUIZ_PER_PAGE)
          .limit(QUIZ_PER_PAGE)
          .sort({ createdAt: -1 })
          .lean();

        return submissions;
      } catch (err) {
        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async isQuizAttempted(_, { quizId }, { req }) {
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

        const result = await Result.findOne({
          userId: req.userId,
          quizId: quizId,
        });

        return { Success: Boolean(result), resultId: result?._id };
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },
  },

  Mutation: {
    async markQuizResultSeen(_, { quizId }, { req }) {
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

        const result = new Result({
          quizId: quiz._id,
          score: 0,
          status: "previewd",
          userAnswers: [],
          userId: req.userId,
        });

        let playerStats = await PlayerStats.findOne({ userId: req.userId });

        if (!playerStats) {
          playerStats = new PlayerStats({
            userId: req.userId,
            quizzes: [],
          });
        }
        playerStats.previewed[quiz.difficulty]++;
        playerStats.quizzes.push(quiz._id);

        let playerStatCategory = playerStats.category.find(
          (c) => c._id.toString() === quiz.categoryId.toString()
        );

        if (!playerStatCategory) {
          playerStats.category.push({
            categoryId: quiz.categoryId,
            previewed: {
              [quiz.difficulty]: 1,
            },
            quizzes: [quiz._id],
          });
        } else {
          playerStatCategory.previewed[quiz.difficulty]++;
          playerStatCategory.quizzes.push(quiz._id);
        }

        await playerStats.save();

        await result.save();
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

module.exports = resultResolver;
