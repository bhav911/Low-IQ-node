const express = require("express");
const { createServer } = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const startGraphQLServe = require("./graphql/graphqlserver");
const { Server } = require("socket.io");
const { Redis } = require("ioredis");
const roomFunctions = require("./socket.io/room");

const QuizStats = require("./models/quizStats");
const User = require("./models/User");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const redis = new Redis(process.env.UPSTASH_REDIS_CONNECTION_STRING);
const ROOM_TTL = 60; // Auto-delete rooms after 30 minutes

//routes
const notificationRoute = require("./routes/notification.routes");
const quizRoutes = require("./routes/quiz.routes");
const accountRoutes = require("./routes/account.routes");

app.get("/", (req, res) => {
  res.send("API is working!");
});

const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.va53l.mongodb.net/${process.env.MONGO_DATABASE}`;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // This is where your Angular app is running in development
    methods: "GET,POST,PUT,DELETE", // Allow specific HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Add your custom headers here
    credentials: true, // Allow cookies to be sent
  })
);

app.use(express.json());

app.use("/notification", notificationRoute);
app.use("/quiz", quizRoutes);
app.use("/account", accountRoutes);

app.use((error, req, res, next) => {
  console.log(error);

  let status = error.statusCode;
  let message = error.message;
  res.status(status).json({
    errors: [
      {
        message: message || "Something went wrong",
      },
    ],
  });
});

mongoose
  .connect(uri)
  .then(async (result) => {
    const existingDoc = await QuizStats.findById("global_stats");
    if (!existingDoc) {
      const quizStats = new QuizStats({
        _id: "global_stats",
      });
      await quizStats.save();
    }

    console.log("connected to DB");

    startGraphQLServe(app);

    io.on("connection", (socket) => {
      socket.on("createRoom", (data, callback) =>
        roomFunctions.createRoom(socket, data, callback)
      );

      socket.on("joinRoom", (data, callback) =>
        roomFunctions.joinRoom(socket, data, callback)
      );

      socket.on("fetchRooms", (_, callback) =>
        roomFunctions.fetchRooms(callback)
      );

      socket.on("startQuiz", (data) => roomFunctions.startQuiz(io, data));

      socket.on("leaveRoom", (data) =>
        roomFunctions.leaveRoom(io, socket, data)
      );

      socket.on("quizSubmitted", (data, callback) =>
        roomFunctions.quizSubmitted(io, socket, data, callback)
      );
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("error: " + err);
  });
