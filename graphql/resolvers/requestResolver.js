const { GraphQLError } = require("graphql");

const Request = require("../../models/Request");
const Category = require("../../models/Category");
const CreatorStats = require("../../models/CreatorStats");
const User = require("../../models/User");
const QuizStats = require("../../models/quizStats");

const MESSAGE_PER_PAGE = 6;
const REQUEST_PER_PAGE = 20;

const requestResolver = {
  Query: {
    async fetchRequests(_, { page }, { req }) {
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
        if (user.role === "player") {
          throw new GraphQLError("Not Authorized!", {
            extensions: { code: 403 },
          });
        }

        const filter =
          user.role === "creator" ? { creatorId: user._id } : undefined;

        const requests = await Request.find(filter)
          .skip((page - 1) * REQUEST_PER_PAGE)
          .limit(REQUEST_PER_PAGE)
          .sort({ updatedAt: -1 })
          .populate("creatorId", "_id username profilePicture")
          .populate("quizId", "_id title")
          .lean();

        return requests;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async fetchConversation(_, { requestId, page }, { req }) {
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
        if (user.role === "player") {
          throw new GraphQLError("Not Authorized!", {
            extensions: { code: 403 },
          });
        }

        const request = await Request.findById(requestId).populate(
          "conversation.userId",
          "_id username role profilePicture"
        );
        if (!request) {
          throw new GraphQLError("Request Not Found!", {
            extensions: { code: 404 },
          });
        }

        if (
          user.role !== "admin" &&
          user._id.toString() !== request.creatorId.toString()
        ) {
          throw new GraphQLError("Not Authorized!", {
            extensions: { code: 403 },
          });
        }

        if (user.role === "creator") {
          request.hasSeen = true;
        }
        await request.save();

        const messages = request.conversation.slice(
          (page - 1) * MESSAGE_PER_PAGE,
          page * MESSAGE_PER_PAGE
        );

        return messages;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },
  },

  Mutation: {
    async createFeedback(_, { requestId, feedback, status }, { req }) {
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
        if (user.role !== "admin") {
          throw new GraphQLError("Not Authorized!", {
            extensions: { code: 403 },
          });
        }

        const request = await Request.findById(requestId).populate(
          "quizId",
          "difficulty categoryId quizStatus"
        );
        request.conversation.push({
          message: feedback,
          userId: req.userId,
          status: status,
        });
        request.messageCount++;

        request.quizId.quizStatus = status;
        request.status = status;
        request.hasSeen = false;
        await request.quizId.save();

        const creatorStat = await CreatorStats.findOne({
          userId: request.creatorId,
        });

        creatorStat.pending[request.quizId.difficulty]--;
        creatorStat[status][request.quizId.difficulty]++;

        let creatorCategory = creatorStat.category.find(
          (c) =>
            c.categoryId.toString() === request.quizId.categoryId.toString()
        );

        creatorCategory.pending[request.quizId.difficulty]--;
        creatorCategory[status][request.quizId.difficulty]++;
        await creatorStat.save();

        if (status === "accepted") {
          const category = await Category.findById(request.quizId.categoryId);
          category.isActive = true;
          category.meta[request.quizId.difficulty]++;
          await category.save();

          const quizStats = await QuizStats.findById("global_stats");
          quizStats.totalQuizzes++;
          quizStats.difficulty[request.quizId.difficulty]++;
          await quizStats.save();
        }

        await request.save();

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

module.exports = requestResolver;
