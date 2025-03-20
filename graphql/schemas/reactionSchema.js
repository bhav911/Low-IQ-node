const { gql } = require("graphql-tag");

const reactionTypeDefs = gql`
  #graphql
  enum ReactionStatus {
    liked
    disliked
  }

  type Comment {
    _id: ID!
    userId: User!
    parentCommentId: Comment
    mentions: [Mention!]
    text: String!
    reaction: ReactionStatus
    reactionCount: ReactionCount
    repliesCount: Int!
    createdAt: String
  }

  type ReactionCount {
    liked: Int!
    disliked: Int!
  }

  type CommentReaction {
    _id: ID!
    userId: ID!
    commentId: ID!
    reaction: ReactionStatus
  }

  type Mention {
    userId: ID!
    username: String!
  }

  input CommentInputData {
    _id: ID
    quizId: String
    parentCommentId: ID
    text: String!
  }

  type Query {
    fetchComments(quizId: String!, page: Int!, sortOrder: Int!): [Comment!]!
    fetchReplies(commentId: String!, page: Int!): [Comment!]!
  }

  type Mutation {
    createComment(CommentInput: CommentInputData!): Comment!
    updateComment(CommentInput: CommentInputData!): Comment!
    deleteComment(commentId: String!): Status!
    updateCommentReaction(
      commentId: String!
      reaction: ReactionStatus!
    ): Status!
  }
`;

module.exports = reactionTypeDefs;
