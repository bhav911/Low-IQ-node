const { generateRoomCredentials } = require("../utils/roomHelper");
const { Redis } = require("ioredis");

const User = require("../models/User");
const { generateQuizHelper } = require("../controller/quiz.controller");

const redis = new Redis(process.env.UPSTASH_REDIS_CONNECTION_STRING);

const roomFunction = {
  createRoom: async (
    socket,
    { title, difficulty, max_participants, question_count, isPrivate, adminId },
    callback
  ) => {
    try {
      const { roomId, password } = generateRoomCredentials();

      const roomExists = await redis.exists(roomId);
      if (roomExists) {
        socket.emit("error", "Room already exist");
        return;
      }

      const user = await User.findById(adminId);
      if (!user) {
        socket.emit("error", "Invalid Request");
        return;
      }

      const roomDetail = {
        title,
        difficulty,
        max_participants,
        questionCount: question_count,
        isPrivate,
        adminId,
        status: "in-lobby",
        createdAt: Date.now(),
      };

      if (isPrivate) {
        roomDetail.password = password;
      } else {
        await redis.zadd("public_rooms", max_participants - 1, roomId);
      }

      await redis.hmset(roomId, roomDetail);

      socket.join(roomId.slice(5));
      await redis.sadd(
        roomId + ":players",
        JSON.stringify({
          userId: adminId,
          isAdmin: true,
          username: user.username,
          profilePhoto: user.profilePicture.link,
        })
      );

      if (!isPrivate) {
        socket.broadcast.emit("newRoom", {
          ...roomDetail,
          roomId: roomId.slice(5),
          currentPlayers: 1,
        });
      }

      roomDetail.players = [
        {
          userId: adminId,
          isAdmin: true,
          username: user.username,
          profilePhoto: user.profilePicture.link,
        },
      ];
      roomDetail.currentPlayers = 1;
      callback({ ...roomDetail, roomId: roomId.slice(5) });
    } catch (err) {
      console.log("Error: " + err);
      socket.emit("errro", "Something went wrong!");
      return;
    }
  },

  joinRoom: async (io, socket, { roomId, password, userId }, callback) => {
    try {
      const user = await User.findById(userId);

      if (!user) {
        socket.emit("error", {
          msg: "Not Authenticated",
          roomId,
        });
        return;
      }

      const roomKey = "room:" + roomId;
      const playerRoomKey = roomKey + ":players";
      const roomData = await redis.hgetall(roomKey);
      if (
        Object.keys(roomData).length === 0 ||
        (roomData.isPrivate === "true" && roomData.password !== password)
      ) {
        socket.emit("error", "Room Does not exist");
        return;
      }

      const currentPlayers = await redis.scard(playerRoomKey);
      const maxPlayers = +roomData.max_participants;
      if (currentPlayers >= maxPlayers) {
        socket.emit("error", "Room filled!");
        return;
      }

      if (roomData.status === "in-progress") {
        socket.emit("error", "Game Started! try again later...");
        return;
      }

      const player = {
        userId,
        isAdmin: false,
        username: user.username,
        profilePhoto: user.profilePicture.link,
      };
      await redis.sadd(playerRoomKey, JSON.stringify(player));

      socket.join(roomId);

      socket.to(roomId).emit("playerJoined", {
        ...player,
        currentPlayers: currentPlayers + 1,
      });

      if (roomData.isPrivate === "false") {
        await redis.zincrby("public_rooms", -1, roomKey);

        if (maxPlayers === currentPlayers) {
          await redis.zrem("public_rooms", roomKey);
        }
      }

      const luck = randomLuckGenerator();

      if (
        roomData.isPrivate === "false" &&
        maxPlayers > currentPlayers &&
        luck
      ) {
        io.emit("newRoom", {
          ...roomData,
          roomId,
          currentPlayers: currentPlayers + 1,
        });
      }

      const players = await redis.smembers(playerRoomKey);
      const parsedPlayers = players.map((player) => JSON.parse(player));
      callback({
        ...roomData,
        roomId,
        currentPlayers: currentPlayers + 1,
        players: parsedPlayers,
      });
    } catch (err) {
      console.log("Error: " + err);
      socket.emit("errro", "Something went wrong!");
      return;
    }
  },

  fetchRooms: async (callback) => {
    try {
      const sortedRooms = await redis.zrange(
        "public_rooms",
        0,
        9,
        "WITHSCORES"
      );

      const rooms = [];

      for (let index = 0; index < sortedRooms.length; index = index + 2) {
        const roomData = await redis.hgetall(sortedRooms[index]);
        const maxPlayers = +roomData.max_participants;
        const vacantPlace = +sortedRooms[index + 1];
        rooms.push({
          roomId: sortedRooms[index].slice(5),
          currentPlayers: maxPlayers - vacantPlace,
          ...roomData,
        });
      }

      callback(rooms);
    } catch (err) {
      console.log("Error: " + err);
      socket.emit("errro", "Something went wrong!");
      return;
    }
  },

  leaveRoom: async (io, socket, { roomId, userId }) => {
    try {
      const roomKey = "room:" + roomId;
      const roomPlayerKey = roomKey + ":players";

      const roomExists = await redis.exists(roomKey);
      if (!roomExists) {
        socket.emit("error", "Room not found!");
        return;
      }
      const roomData = await redis.hgetall(roomKey);
      const isRoomPrivate = roomData.isPrivate;
      const maxPlayers = +roomData.max_participants;

      const players = await redis.smembers(roomPlayerKey);
      const playerToRemove = players.find((player) => {
        const parsed = JSON.parse(player);
        return parsed.userId === userId;
      });

      const parsedPlayer = JSON.parse(playerToRemove);

      let nextAdmin;
      if (parsedPlayer.isAdmin) {
        for (let i = 0; i < players.length; i++) {
          const player = JSON.parse(players[i]);
          if (player.userId !== userId) {
            nextAdmin = player;
            break;
          }
        }
      }

      if (nextAdmin) {
        await redis.hset(roomKey, {
          adminId: nextAdmin.userId,
        });
        await redis.srem(roomPlayerKey, JSON.stringify(nextAdmin));
        nextAdmin.isAdmin = true;
        await redis.sadd(roomPlayerKey, JSON.stringify(nextAdmin));
      }

      if (playerToRemove) {
        socket.leave(roomId);
        const currentPlayers = await redis.scard(roomPlayerKey);
        if (
          (nextAdmin && currentPlayers <= 0) ||
          (!nextAdmin && currentPlayers <= 1)
        ) {
          await redis.del(
            roomKey,
            roomPlayerKey,
            "quiz:" + roomId,
            "result:" + roomId
          );
          await redis.zrem("public_rooms", roomKey);
          const room = io.sockets.adapter.rooms.get(roomId);
          if (!room) {
            console.log(`Room ${roomId} is now empty and deleted.`);
          }
        } else {
          await redis.srem(roomPlayerKey, playerToRemove);
          if (isRoomPrivate === "false") {
            await redis.zincrby("public_rooms", 1, roomKey);
          }
          const playerSubmited = (await redis.zcard("result:" + roomId)) || 0;
          if (playerSubmited >= currentPlayers) {
            await redis.hset("room:" + roomId, {
              status: "in-lobby",
              startedAt: undefined,
            });
            await redis.del("result:" + roomId, "quiz:" + roomId);
            io.to(roomId).emit("quizFinished");
          }
          const luck = randomLuckGenerator();
          if (
            roomData.status === "in-lobby" &&
            roomData.isPrivate === "false" &&
            maxPlayers > currentPlayers &&
            luck
          ) {
            socket.broadcast.emit("newRoom", {
              ...roomData,
              roomId,
              currentPlayers: currentPlayers - 1,
            });
          }
          socket.to(roomId).emit("playerLeft", {
            userId,
            currentPlayers: currentPlayers - 1,
            nextAdmin: nextAdmin?.userId || undefined,
          });
        }
      }
    } catch (err) {
      console.log("Error: " + err);
      socket.emit("errro", "Something went wrong!");
      return;
    }
  },

  startQuiz: async (io, { roomId, userId, difficulty, questionCount }) => {
    try {
      const room = await redis.hgetall("room:" + roomId);
      if (Object.keys(room).length === 0) {
        socket.emit("error", "Room not found!");
        return;
      }
      if (room.adminId !== userId) {
        socket.emit("error", "Not Allowed!");
        return;
      }
      let quiz;
      try {
        quiz = await generateQuizHelper(room.title, questionCount, difficulty);
      } catch (error) {
        socket.emit("error", "Something Went Wrong!");
        return;
      }

      quiz.questions.forEach((question, index) => {
        question._id = "q" + (index + 1);
        question.options.forEach((option, index) => {
          option._id = "o" + (index + 1);
        });
      });
      quiz.questionCount = quiz.questions.length;

      let quizCopy = { ...quiz };

      const questions = quizCopy.questions;
      quizCopy.questions = JSON.stringify(questions);
      await redis.hmset("quiz:" + roomId, quizCopy);

      await redis.hset("room:" + roomId, {
        status: "in-progress",
        startedAt: Date.now(),
        difficulty,
        questionCount,
      });

      quiz.questions.forEach((question) => {
        question.options.forEach((option) => {
          delete option.isCorrect;
        });
      });

      io.to(roomId).emit("quizStarted", quiz);

      const timePerQuestion = timePerSecondFinder(difficulty);

      await redis.expire(
        `quiz:${roomId}`,
        questionCount * (timePerQuestion + 30)
      );
      await redis.expire(
        `result:${roomId}`,
        questionCount * (timePerQuestion + 30)
      );
    } catch (err) {
      console.log("Error: " + err);
      socket.emit("error", "Something went wrong!");
      return;
    }
  },

  quizSubmitted: async (
    io,
    socket,
    { roomId, userId, userAnswers },
    callback
  ) => {
    try {
      const existsCount = await redis.exists(
        `room:${roomId}`,
        `quiz:${roomId}`
      );
      if (existsCount !== 2) {
        socket.emit("error", "Something went wrong!");
        return;
      }

      let maxPlayers = +(await redis.hget(
        `room:${roomId}`,
        "max_participants"
      ));

      let score = 0;

      const stringQuestions = await redis.hget("quiz:" + roomId, "questions");
      const questions = JSON.parse(stringQuestions);

      questions.forEach((question) => {
        const correctOptionId = question.options.find((o) => o.isCorrect)._id;
        const userSelectedOption = userAnswers.find(
          (u) => u.questionId === question._id
        );
        userSelectedOption.correctOptionId = correctOptionId;

        if (correctOptionId === userSelectedOption.optionId) {
          score += +question.point;
        }
      });
      await redis.zadd("result:" + roomId, score, userId);
      socket.to(roomId).emit("quizSubmitted", { userId, score });
      const playerSubmited = await redis.zcard("result:" + roomId);
      const playersInRoom = await redis.scard("room:" + roomId + ":players");
      if (playerSubmited >= playersInRoom) {
        await redis.hset("room:" + roomId, {
          status: "in-lobby",
          startedAt: undefined,
        });
        await redis.del("result:" + roomId, "quiz:" + roomId);
        io.to(roomId).emit("quizFinished");

        const luck = randomLuckGenerator();
        if (
          roomData.isPrivate === "false" &&
          maxPlayers > playersInRoom &&
          luck
        ) {
          let roomData = await redis.hgetall(`room:${roomId}`);
          io.emit("newRoom", {
            ...roomData,
            roomId,
            currentPlayers,
          });
        }
        socket.to(roomId).emit("playerLeft", {
          userId,
          currentPlayers: currentPlayers - 1,
          nextAdmin: nextAdmin?.userId || undefined,
        });
      }

      callback({ scoreCard: userAnswers, score });
    } catch (err) {
      console.log("Error: " + err);
      socket.emit("errro", "Something went wrong!");
      return;
    }
  },
};

function timePerSecondFinder(difficulty) {
  switch (difficulty) {
    case "easy": {
      return 45;
    }
    case "medium": {
      return 90;
    }
    case "hard": {
      return 150;
    }
  }
}

function randomLuckGenerator() {
  const val = Math.random();
  return val <= 0.33;
}

module.exports = roomFunction;
