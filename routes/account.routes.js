const express = require("express");
const multer = require("multer");

const isAuth = require("../middleware/auth");
const accountController = require("../controller/account.controller");

const router = express.Router();

router.post(
  "/updateProfileImage",
  isAuth,
  multer().single("image"),
  accountController.updateProfileImage
);

router.post(
  "/deleteProfileImage",
  isAuth,
  accountController.deleteProfileImage
);

router.post("/sendOTP", isAuth, accountController.sendOTP);

router.post("/verifyOTP", isAuth, accountController.verifyOTP);

router.post("/sendPassResetMail", isAuth, accountController.sendPassResetMail);

router.post(
  "/validatePasswordResetToken",
  isAuth,
  accountController.validatePasswordResetToken
);

module.exports = router;
