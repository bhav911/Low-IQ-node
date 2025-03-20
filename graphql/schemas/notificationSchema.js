const { gql } = require("graphql-tag");

const notificationTypeDefs = gql`
  #graphql

  type Notification {
    _id: ID!
    userId: String!
    content: String!
    hasSeen: Boolean!
    iconLink: String!
    type: String!
    navigationRoute: String!
    createdAt: String!
  }
`;

module.exports = notificationTypeDefs;
