const { gql } = require("graphql-tag");

const requestTypeDefs = gql`
  #graphql

  enum RequestStatus {
    accepted
    rejected
    pending
  }

  type Message {
    _id: ID!
    userId: User!
    message: String
    status: RequestStatus
    createdAt: String!
  }

  type Request {
    _id: ID!
    creatorId: User!
    quizId: Quiz!
    type: [String!]!
    messageCount: Int!
    status: RequestStatus!
    conversation: [Message!]!
    createdAt: String!
    hasSeen: Boolean!
  }

  type Query {
    fetchRequests(page: Int!): [Request!]!
    fetchConversation(requestId: String!, page: Int!): [Message!]!
  }

  type Mutation {
    createFeedback(
      requestId: String!
      feedback: String!
      status: RequestStatus!
    ): Status!
  }
`;

module.exports = requestTypeDefs;
