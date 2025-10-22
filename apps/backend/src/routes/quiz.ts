import express from "express";
import { generateQuiz } from "../controllers/quizController";

const router = express.Router();

// Define the route for generating quizzes
router.post("/generate", generateQuiz);

export default router;