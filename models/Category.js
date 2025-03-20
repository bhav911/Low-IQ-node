const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  creatorId: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
  meta: {
    easy: {
      type: Number,
      default: 0,
    },
    medium: {
      type: Number,
      default: 0,
    },
    hard: {
      type: Number,
      default: 0,
    },
  },
});

module.exports = mongoose.model("Category", CategorySchema);
