const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");
require("dotenv").config();

const { sendEmail } = require("../utils/emailHelper");

const User = require("../models/User");

exports.updateProfileImage = async (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("Not Authenticated!");
    error.statusCode = 401;
    throw error;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User Not Found!");
      error.statusCode = 404;
      throw error;
    }

    if (!req.file) {
      const error = new Error("File Not Provided!");
      error.statusCode = 422;
      throw error;
    }
    const formData = new FormData();
    formData.append("image", req.file.buffer.toString("base64"));

    var config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.imgur.com/3/image",
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        ...formData.getHeaders(),
      },
      data: formData,
    };

    const response = await axios(config);
    const profilePicture = {
      link: response.data.data.link,
      deleteHash: response.data.data.deletehash,
    };

    user.profilePicture = profilePicture;
    await user.save();

    return res.status(200).json(profilePicture.link);
  } catch (err) {
    console.log(err);

    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteProfileImage = async (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("Not Authenticated!");
    error.statusCode = 401;
    throw error;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User Not Found!");
      error.statusCode = 404;
      throw error;
    }

    const formData = new FormData();

    var config = {
      method: "delete",
      maxBodyLength: Infinity,
      url: `https://api.imgur.com/3/image/${user.profilePicture.deleteHash}`,
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        ...formData.getHeaders(),
      },
      data: formData,
    };

    const response = await axios(config);
    user.profilePicture = undefined;
    await user.save();

    return res.status(200).json({ Success: true });
  } catch (err) {
    console.log(err);

    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.sendOTP = async (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("Not Authenticated!");
    error.statusCode = 401;
    throw error;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User Not Found!");
      error.statusCode = 404;
      throw error;
    }

    const generatedOtp = Math.floor(1000 + Math.random() * 9000);
    user.emailVerificationOTP = generatedOtp;
    user.emailVerificationOTPexpiration = new Date(Date.now() + 60 * 10 * 1000);

    let template_variable = {
      name: user.username,
      product_name: "LowIQ Quiz",
      otp: generatedOtp,
    };
    let template_ID = 39315731;

    await user.save();
    const status = await sendEmail(user.email, template_ID, template_variable);
    if (status) {
      return res.status(200).json({ Success: true });
    }
    const error = new Error("Internal server error, try again later!");
    error.statusCode = 500;
    throw error;
  } catch (err) {
    console.log(err);

    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.verifyOTP = async (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("Not Authenticated!");
    error.statusCode = 401;
    throw error;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User Not Found!");
      error.statusCode = 404;
      throw error;
    }

    const userOTP = req.body.otp;
    if (
      user.emailVerificationOTP === userOTP &&
      user.emailVerificationOTPexpiration > Date.now()
    ) {
      user.emailVerified = true;
      user.emailVerificationOTP = undefined;
      user.emailVerificationOTPexpiration = undefined;
      await user.save();

      return res.status(200).json({ Success: true });
    }

    const error = new Error("Invalid OTP");
    error.statusCode = 401;
    throw error;
  } catch (err) {
    console.log(err);

    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.sendPassResetMail = async (req, res, next) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User Not Found!");
      error.statusCode = 404;
      throw error;
    }

    const buffer = crypto.randomBytes(32);
    const token = buffer.toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordTokenExpiration = Date.now() + 60 * 60 * 1000;
    await user.save();

    let template_variable = {
      name: user.username,
      product_name: "LowIQ Quiz",
      action_url: `http://localhost:4200/reset-password/${token}`,
    };
    let template_ID = 38864483;
    const status = await sendEmail(user.email, template_ID, template_variable);
    if (status) {
      return res.status(200).json({ Success: true });
    }
    const error = new Error("Internal server error, try again later!");
    error.statusCode = 500;
    throw error;
  } catch (err) {
    console.log(err);

    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.validatePasswordResetToken = async (req, res, next) => {
  try {
    const token = req.body.token;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpiration: { $gt: Date.now() },
    });
    return res.status(200).json({ userId: user ? user._id : null });
  } catch (err) {
    console.log(err);

    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
