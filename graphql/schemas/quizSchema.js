const { gql } = require("graphql-tag");

const quizTypeDefs = gql`
  #graphql
  enum Difficulty {
    easy
    medium
    hard
  }

  enum QuizStatus {
    accepted
    rejected
    pending
  }

  type Quiz {
    _id: ID!
    title: String!
    description: String!
    quizStatus: QuizStatus!
    creatorId: User!
    isAttempted: Boolean
    resultId: String
    reaction: ReactionStatus
    comments: [Comment!]
    categoryId: Category!
    questionCount: Int!
    meta: QuizMeta!
    totalPoints: Int!
    difficulty: Difficulty!
    questions: [Question]!
  }

  type QuizMeta {
    attempted: Int!
    passed: Int!
    disliked: Int!
    liked: Int!
    acceptanceRate: String!
  }

  type Question {
    _id: ID!
    question: String!
    questionImage: String
    options: [Option]!
    point: Int!
  }

  type Option {
    _id: ID!
    option: String!
    isCorrect: Boolean!
  }

  input QuestionInputData {
    question: String!
    questionImage: String
    options: [OptionInputData]!
    point: Int!
  }

  input OptionInputData {
    option: String!
    isCorrect: Boolean!
  }

  type StatusWithResultId {
    Success: Boolean!
    resultId: String
  }

  input QuizInputData {
    title: String!
    categoryId: String!
    description: String!
    note: String
    difficulty: Difficulty!
    questions: [QuestionInputData!]!
  }

  input UpdateQuizInputData {
    _id: String!
    title: String!
    categoryId: String!
    note: String
    description: String!
    difficulty: Difficulty!
    questions: [QuestionInputData!]
  }

  input AnswerInputData {
    questionId: String!
    optionId: String!
  }

  input QuizSubmitionInputData {
    quizId: String!
    userAnswers: [AnswerInputData]!
  }

  input FilterInputData {
    categoryId: String
    creatorId: String
    difficulty: String
    published: Boolean
    status: QuizStatus
    page: Int
  }

  type QuizSet {
    quizzes: [Quiz]!
    categories: [Category!]!
    quizStats: meta!
  }

  type Query {
    getQuiz(id: String!): Quiz!
    getAllQuizzes(filterInput: FilterInputData): [Quiz]!
    canQuizBeUpdated(id: String!): Status!
    getQuizStats: meta!
    getQuizSet(filterInput: FilterInputData): QuizSet!
    getCreatorQuizzes(filterInput: FilterInputData): [Quiz!]!
  }

  type Mutation {
    createQuiz(quizInput: QuizInputData): String!
    updateQuiz(quizInput: UpdateQuizInputData): String!
    submitQuiz(submitionInput: QuizSubmitionInputData): String!
    updateQuizPublicationStatus(quizId: String!, status: Boolean!): Status!
    updateQuizReaction(quizId: String!, userReaction: ReactionStatus!): Status!
  }
`;

module.exports = quizTypeDefs;
