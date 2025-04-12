const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const User = require("../models/User");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generateQuiz = async (req, res, next) => {
  const { quizDescription, numberOfQuestion, difficulty } = req.query;

  if (!req.isAuth) {
    const error = new Error("Not Authenticated!");
    error.code = 401;
    throw error;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User Not Found!");
      error.code = 404;
      throw error;
    }

    const parsedQuiz = await this.generateQuizHelper(
      quizDescription,
      numberOfQuestion,
      difficulty
    );
    return res.status(200).json(parsedQuiz);
  } catch (err) {
    console.log(err);

    if (!err.code) {
      err.code = 500;
    }
    next(err);
  }
};

exports.generateQuizHelper = async (
  quizDescription,
  numberOfQuestion,
  difficulty
) => {
  const prompt = `
  Generate a highly engaging and unique quiz about "${quizDescription}" with exactly ${numberOfQuestion} questions, 
  and if you can't generate ${numberOfQuestion} questions 
  then use topics relevant to ${quizDescription} but generate exactly ${numberOfQuestion} questions of ${difficulty} difficulty. 
  
  Each question should:
  - Be clear, thought-provoking, and relevant to the quiz topic.
  - Have **4 distinct and non-repetitive options** with only one correct answer.
  - Assign a point value between **1 and 10** based on the question's complexity.
  - If a question needs an image then browse it from the internet and add its url. But make sure that imageURL is working
  
  Ensure the quiz follows this strict JSON format:
  {
    "title": "string",
    "description": "string",
    "difficulty": "easy" | "medium" | "hard",
    "questions": [
      {
        "question": "string",
        "questionImage"?: "string
        "point": number between 1 to 10,
        "options": [
          { "option": "string", "isCorrect": boolean },
          { "option": "string", "isCorrect": boolean },
          { "option": "string", "isCorrect": boolean },
          { "option": "string", "isCorrect": boolean }
        ]
      }
    ]
  }
  
  **Important rules:**
  - Ensure all options are plausible and creative — avoid generic or repetitive answers.
  - Questions and options should be fact-checked and reliable.
  - Do not repeat any questions or options.
  - Make the quiz fun, engaging, and suitable for the target audience.
  
  Output only the JSON response without any additional text or explanations.
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const rawResponse = result.response.text();
  const cleanedResponse = rawResponse.replace(/```json|```/g, "").replace(/,\s*([}\]])/g, '$1').trim();
  const parsedQuiz = JSON.parse(cleanedResponse);
  return parsedQuiz;
};
