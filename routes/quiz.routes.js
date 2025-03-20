const express = require("express");

const isAuth = require("../middleware/auth");

const quizController = require("../controller/quiz.controller");

const router = express.Router();

router.get("/generateQuiz", isAuth, quizController.generateQuiz);

module.exports = router;
