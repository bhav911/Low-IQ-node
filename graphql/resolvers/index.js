const userResolver = require("./userResolver");
const quizResolver = require("./quizResolver");
const categoryResolver = require("./categoryResolver");
const reactionResolver = require("./reactionResolver");
const resultResolver = require("./resultResolver");
const requestResolver = require("./requestResolver");

const resolvers = {
  Query: {
    ...userResolver.Query,
    ...quizResolver.Query,
    ...categoryResolver.Query,
    ...reactionResolver.Query,
    ...resultResolver.Query,
    ...requestResolver.Query,
    getQuizSet: async (_, { filterInput }, { req }) => {
      const quizzes = await quizResolver.Query.getAllQuizzes(
        _,
        { filterInput },
        { req }
      );
      const categories = await categoryResolver.Query.getCategories(
        _,
        {},
        {
          req,
        }
      );
      const quizStats = await quizResolver.Query.getQuizStats();
      return { quizzes, categories, quizStats };
    },
  },
  Mutation: {
    ...userResolver.Mutation,
    ...quizResolver.Mutation,
    ...reactionResolver.Mutation,
    ...resultResolver.Mutation,
    ...requestResolver.Mutation,
  },
};

module.exports = { resolvers };
