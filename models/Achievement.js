const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const achievementSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  quizToComplete: {
    type: Number,
    required: true,
  },
  lockedDescription: {
    type: String,
    required: true,
  },
  secondPersonDescription: {
    type: String,
    required: true,
  },
  iconUrl: {
    type: String,
    required: true,
  },
  lockedIconUrl: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Achievement", achievementSchema);
