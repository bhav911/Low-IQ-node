const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: String,
    status: {
      type: String,
      enum: ["accepted", "pending", "rejected"],
    },
  },
  {
    timestamps: true,
  }
);

const requestSchema = new Schema(
  {
    creatorId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quizId: {
      type: mongoose.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    type: {
      type: [String],
      enum: {
        values: ["new quiz", "edit quiz", "new category"],
      },
      required: true,
    },
    messageCount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["accepted", "pending", "rejected"],
      required: true,
      default: "pending",
    },
    conversation: [messageSchema],
    hasSeen: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Request", requestSchema);
