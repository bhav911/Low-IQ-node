const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["passed", "failed", "previewd"],
      required: true,
    },
    userAnswers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Quiz.questions",
          required: true,
        },
        optionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Quiz.questions.options",
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Result", resultSchema);
