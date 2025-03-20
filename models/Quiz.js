const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const quizSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    quizStatus: {
      type: String,
      enum: ["accepted", "rejected", "pending"],
      required: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    difficulty: {
      type: String,
      required: true,
    },
    questionCount: {
      type: Number,
      required: true,
    },
    totalPoints: {
      type: Number,
      required: true,
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        questionImage: String,
        point: {
          type: Number,
          required: true,
        },
        options: [
          {
            option: {
              type: String,
              required: true,
            },
            isCorrect: {
              type: Boolean,
              required: true,
            },
          },
        ],
      },
    ],
    meta: {
      attempted: {
        type: Number,
        default: 0,
      },
      passed: {
        type: Number,
        default: 0,
      },
      liked: {
        type: Number,
        default: 0,
      },
      disliked: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Quiz", quizSchema);
