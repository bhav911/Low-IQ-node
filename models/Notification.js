const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    hasSeen: {
      type: Boolean,
      default: false,
    },
    iconLink: String,
    type: {
      type: String,
      required: true,
      enum: ["achievement", "system", "alert"],
    },
    navigationRoute: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", NotificationSchema);
