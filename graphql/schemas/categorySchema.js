const gql = require("graphql-tag");

const categorySchema = gql`
  type Category {
    _id: ID!
    creatorId: User!
    isActive: Boolean
    title: String!
    quizzes: [Quiz!]
    playerStats: PlayerStats
    creatorStats: CreatorStats
    meta: meta!
  }

  type PlayerStats {
    attempted: meta!
    passed: meta!
    previewed: meta!
  }

  type CreatorStats {
    accepted: meta!
    rejected: meta!
    pending: meta!
  }

  type meta {
    easy: Int!
    medium: Int!
    hard: Int!
  }

  type Query {
    fetchCategory(_id: String!): Category!
    getCategories: [Category!]!
  }
`;

module.exports = categorySchema;
