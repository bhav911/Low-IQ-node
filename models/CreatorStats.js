const mongoose = require("mongoose");

const CreatorStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  accepted: {
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
  rejected: {
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
  pending: {
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
  category: [
    {
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
      accepted: {
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
      rejected: {
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
      pending: {
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
});

module.exports = mongoose.model("CreatorStats", CreatorStatsSchema);
