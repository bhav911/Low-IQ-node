const Category = require("../../models/Category");
const CreatorStats = require("../../models/CreatorStats");
const PlayerStats = require("../../models/PlayerStats");
const User = require("../../models/User");
const { GraphQLError } = require("graphql");

const QUIZ_PER_PAGE = 15;

const categoryResolver = {
  Query: {
    async fetchCategory(_, { _id }, { req }) {
      try {
        const match =
          req.role === "creator"
            ? { creatorId: req.userId }
            : { quizStatus: "accepted" };
        const category = await Category.findById(_id).populate({
          path: "quizzes",
          select: "_id title difficulty quizStatus",
          match: match,
          options: { limit: QUIZ_PER_PAGE, sort: { createdAt: -1 } },
        });

        if (req.isAuth) {
          const user = await User.findById(req.userId);
          if (!user) {
            throw new GraphQLError("User Not Found!", {
              extensions: { code: 404 },
            });
          }

          if (user.role === "player") {
            const playerStats = await PlayerStats.findOne({
              userId: req.userId,
            });
            if (playerStats) {
              const playerStatCategory = playerStats.category.find(
                (cat) => cat.categoryId.toString() === _id.toString()
              );

              if (playerStatCategory) {
                // checking for quizzes already attempted
                const playerCategoryQuizzes = playerStatCategory.quizzes;
                category.quizzes.forEach((quiz) => {
                  const isAttempted = playerCategoryQuizzes.find(
                    (q) => q._id.toString() === quiz._id.toString()
                  );
                  quiz.isAttempted = Boolean(isAttempted);
                });
                category.playerStats = {
                  attempted: playerStatCategory.attempted,
                };
              }
            } else {
              category.playerStats = null;
            }
            //attaching players stat for this category
          } else {
            const creatorStats = await CreatorStats.findOne({
              userId: req.userId,
            });
            const creatorStatCategory = creatorStats.category.find(
              (cat) => cat.categoryId.toString() === _id.toString()
            );

            //attaching creator stat for this category
            category.creatorStats = {
              accepted: creatorStatCategory.accepted,
              rejected: creatorStatCategory.rejected,
              pending: creatorStatCategory.pending,
            };
          }
        }

        return category;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async getCategories(_, __, { req }) {
      try {
        const action = req.query?.action;
        let categories = await Category.find({ isActive: true }).lean();
        if (req.isAuth) {
          const user = await User.findById(req.userId);
          if (user.role === "creator") {
            if (action === "create") {
              categories = await Category.find({
                $or: [{ creatorId: req.userId }, { isActive: true }],
              }).lean();

              const uniqueCategories = Array.from(
                new Map(
                  categories.map((cat) => [cat._id.toString(), cat])
                ).values()
              );
              return uniqueCategories;
            } else {
              const creatorStats = await CreatorStats.findOne({
                userId: req.userId,
              }).populate("category.categoryId", "title _id");

              if (!creatorStats) {
                return [];
              }

              let allCategories = creatorStats.category.map((cat) => {
                return {
                  _id: cat.categoryId._id,
                  title: cat.categoryId.title,
                  meta: {
                    easy: cat.accepted.easy,
                    medium: cat.accepted.medium,
                    hard: cat.accepted.hard,
                  },
                };
              });

              return allCategories;
            }
          }
        }
        return categories;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },
  },
};

module.exports = categoryResolver;
