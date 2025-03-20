const { gql } = require("graphql-tag");

const categorySchema = require("./categorySchema");
const userTypeDefs = require("./userschema");
const quizTypeDefs = require("./quizSchema");
const reactionTypeDefs = require("./reactionSchema");
const resultTypeDefs = require("./resultSchema");
const requestTypeDefs = require("./requestSchema");
const notificationTypeDefs = require("./notificationSchema");

const typeDefs = gql`
  ${userTypeDefs}
  ${quizTypeDefs}
  ${categorySchema}
  ${reactionTypeDefs}
  ${resultTypeDefs}
  ${requestTypeDefs}
  ${notificationTypeDefs}
`;

module.exports = { typeDefs };
