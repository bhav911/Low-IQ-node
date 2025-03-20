const Notification = require("../../models/Notification");

const notificationFunctions = {
  async createNotification(userId, content, type, navigationRoute) {
    try {
      let iconlink = "";

      switch (type) {
        case "achievement": {
          iconlink = "https://i.imgur.com/rBmzUSh.png";
          break;
        }
        case "system": {
          iconlink = "https://i.imgur.com/5bqB0BU.png";
          break;
        }
        case "alert": {
          iconlink = "https://i.imgur.com/xpG9LjT.png";
          break;
        }
        default: {
          const error = new Error("Invalid notification type!");
          error.code = 422;
          throw error;
        }
      }

      const notification = new Notification({
        userId: userId,
        content: content,
        hasSeen: false,
        type: type,
        navigationRoute: navigationRoute,
        iconLink: iconlink,
      });

      const savedNotification = await notification.save();
      return savedNotification.toObject();
    } catch (err) {
      console.log(err);

      throw err;
    }
  },
};

module.exports = { notificationFunctions };
