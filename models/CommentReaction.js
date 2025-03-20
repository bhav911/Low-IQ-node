const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentReactionSchema = new Schema(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
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

module.exports = mongoose.model("CommentReaction", commentReactionSchema);
