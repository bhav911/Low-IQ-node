const { gql } = require("graphql-tag");

const resultTypeDefs = gql`
  #graphql
  type AnswerData {
    questionId: String!
    optionId: String!
  }

  type Result {
    _id: ID!
    quizId: Quiz!
    userId: User!
    score: Int!
    status: String!
    userAnswers: [AnswerData!]!
    createdAt: String!
  }

  type Query {
    getResult(resultId: String!): Result!
    canProceedToResult(resultId: String!): StatusWithResultId!
    isQuizAttempted(quizId: String!): StatusWithResultId!
    getSubmissions(userId: String!, page: Int!): [Result!]!
  }

  type Mutation {
    markQuizResultSeen(quizId: String!): Status!
  }
`;

module.exports = resultTypeDefs;
