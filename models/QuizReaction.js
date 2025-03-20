const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const quizReactionSchema = new Schema(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reaction: {
      type: String,
      enum: ["liked", "disliked"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("QuizReaction", quizReactionSchema);
