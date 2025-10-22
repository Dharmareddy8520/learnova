import { GoogleGenAI } from "@google/genai";
import Quiz from "../models/Quiz";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateQuiz = async (req, res) => {
  try {
    const { text, numQuestions, difficulty } = req.body;

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not authenticated" });
    }

    const prompt = `
      You are an intelligent quiz generator.

      Analyze the following text and generate ${numQuestions} multiple-choice questions (MCQs).
      Each question should test the user's understanding of the text, not memorization.
      Return the output in pure JSON format.

      Rules:
      - Each question must have exactly 4 options.
      - Include the correct answer text in "answer".
      - Do NOT include explanations.

      Text:
      """${text}"""
      Format:
      [
        {
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "answer": "..."
        }
      ]
    `;

    const response = await genAI.generateText({
      model: "models/gemini-2.5-pro",
      prompt,
      maxOutputTokens: 1000,
      temperature: 0.7,
    });

    const questions = JSON.parse(response.candidates[0].output);

    const quiz = await Quiz.create({
      userId: req.user.id,
      textSource: text.slice(0, 500),
      numQuestions,
      difficulty,
      questions,
    });

    res.status(201).json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Quiz generation failed" });
  }
};