const express = require("express");

const isAuth = require("../middleware/auth");

//controller
const notificationController = require("../controller/notification.controller");

const router = express.Router();

router.get(
  "/fetchNofications",
  isAuth,
  notificationController.fetchNotifications
);

router.post(
  "/markAsSeen",
  isAuth,
  notificationController.markNotificationAsSeen
);

module.exports = router;
