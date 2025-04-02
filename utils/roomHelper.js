const crypto = require("crypto");

exports.generateRoomCredentials = () => {
  const roomId = "room:" + crypto.randomInt(100000, 1000000).toString();
  const password = crypto.randomBytes(4).toString("hex");
  return { roomId, password };
};
