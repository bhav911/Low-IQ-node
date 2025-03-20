const mongoose = require("mongoose");

const QuizStatsSchema = new mongoose.Schema({
  _id: { type: String, default: "global_stats" }, // use String type for custom IDs
  totalQuizzes: { type: Number, default: 0 },
  difficulty: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
  },
});

module.exports = mongoose.model("QuizStats", QuizStatsSchema);
