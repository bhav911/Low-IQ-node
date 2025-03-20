const { gql } = require("graphql-tag");

const userTypeDefs = gql`
  enum Role {
    player
    creator
    admin
  }

  type User {
    _id: ID!
    name: String
    username: String!
    email: String!
    emailVerified: Boolean!
    phoneNumber: String
    role: Role!
    achievements: [Achievement!]!
    password: String!
    profilePicture: image
  }

  type image {
    link: String
    deleteHash: String
  }

  type Achievement {
    _id: ID!
    title: String!
    description: String!
    quizToComplete: Int!
    lockedDescription: String!
    secondPersonDescription: String!
    iconUrl: String!
    lockedIconUrl: String!
    isUnlocked: Boolean!
    meta: achievementMeta
  }

  type achievementMeta {
    claimedOn: String
    createdAt: String
  }

  type Profile {
    user: User!
    submissions: [Result!]
    creations: [Quiz!]
    playerStats: PlayerStats
    creatorStats: CreatorStats
    quizStats: meta
  }

  type LoggedUser {
    userId: String!
    username: String!
    token: String!
    role: Role!
    profilePicture: image
    notifications: [Notification!]
  }

  type Status {
    Success: Boolean!
  }

  type UsernameCheckResult {
    isTaken: Boolean!
  }

  input UserInputData {
    username: String!
    email: String!
    role: Role!
    password: String!
  }

  input resetPasswordInputData {
    userId: String!
    password: String!
    token: String!
  }

  type Query {
    authStatus: LoggedUser
    validateToken(token: String!): LoggedUser
    loginUser(email: String!, password: String!): LoggedUser
    getUser: User
    fetchProfile(username: String!): Profile!
    checkIfUsernameIsTaken(username: String!): UsernameCheckResult!
  }

  type Mutation {
    createUser(userInput: UserInputData!): LoggedUser!
    updateUsername(username: String!): Status!
    updateUser(field: String!, value: String!): Status!
    updateEmail(email: String!, password: String!): Status!
    updatePassword(currentPassword: String!, newPassword: String!): Status!
    resetPassword(resetPasswordInput: resetPasswordInputData): Status!
  }
`;

module.exports = userTypeDefs;
