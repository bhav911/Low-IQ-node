const mongoose = require("mongoose");

const PlayerStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  category: [
    {
      categoryId: {
        type: mongoose.Types.ObjectId,
        required: true,
      },
      quizzes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Quiz",
        },
      ],
      attempted: {
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
      passed: {
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
      previewed: {
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
    },
  ],
  quizzes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
    },
  ],
  attempted: {
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
  passed: {
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
  previewed: {
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

module.exports = mongoose.model("PlayerStats", PlayerStatsSchema);
