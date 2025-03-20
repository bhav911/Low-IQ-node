const User = require("../models/User");
const Notification = require("../models/Notification");
const NOTIFICATION_PER_PAGE = 10;
const { GraphQLError } = require("graphql");

exports.fetchNotifications = async (req, res, next) => {
  if (!req.isAuth) {
    throw new GraphQLError("Not Authenticated!", {
      extensions: { code: 401 },
    });
  }

  const page = req.query.page || 1;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User Not Found!");
      error.statusCode = 404;
      throw error;
    }

    const notifications = await Notification.find({ userId: req.userId })
      .skip((page - 1) * NOTIFICATION_PER_PAGE)
      .limit(NOTIFICATION_PER_PAGE)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(notifications);
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.markNotificationAsSeen = async (req, res, next) => {
  if (!req.isAuth) {
    throw new GraphQLError("Not Authenticated!", {
      extensions: { code: 401 },
    });
  }

  const notificationId = req.body.notificationId;
  if (!notificationId) {
    const error = new Error("Notification ID not provided!");
    error.statusCode = 422;
    throw error;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User Not Found!");
      error.statusCode = 404;
      throw error;
    }

    const userNotification = user.notifications.find(
      (n) => n._id.toString() === notificationId
    );

    if (userNotification) {
      userNotification.hasSeen = true;
      await user.save();
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      const error = new Error("Notification Not Found!");
      error.statusCode = 404;
      throw error;
    }
    notification.hasSeen = true;
    await notification.save();
    res.status(200).json({ Success: true });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createNotification = () => {};
