const mongoose = require("mongoose");
const Achievement = require("./Achievement");
const NotificationSchema = require("./Notification");

const achievementSchema = new mongoose.Schema(
  {
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Achievement",
    },
    claimedOn: Date,
  },
  {
    timestamps: true,
  }
);

const UserSchema = new mongoose.Schema({
  name: String,
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  emailVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: String,
  role: {
    type: String,
    default: "player",
  },
  notifications: {
    type: [NotificationSchema.schema],
    default: [],
  },
  achievements: [achievementSchema],
  profilePicture: {
    link: String,
    deleteHash: String,
  },
  resetPasswordToken: String,
  resetPasswordTokenExpiration: Date,
  emailVerificationOTP: String,
  emailVerificationOTPexpiration: Date,
});

module.exports = mongoose.model("User", UserSchema);
