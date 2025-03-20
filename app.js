const express = require("express");
const mongoose = require("mongoose");
const QuizStats = require("./models/quizStats");
const cors = require("cors");
const startGraphQLServe = require("./graphql/graphqlserver");
const app = express();

//routes
const notificationRoute = require("./routes/notification.routes");
const quizRoutes = require("./routes/quiz.routes");
const accountRoutes = require("./routes/account.routes");

const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.va53l.mongodb.net/${process.env.MONGO_DATABASE}`;

console.log("Allowed Frontend URL:", process.env.FRONTEND_URL);

app.use(
  cors({
    origin: "*", // This is where your Angular app is running in development
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
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Listening on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.log("error: " + err);
  });
