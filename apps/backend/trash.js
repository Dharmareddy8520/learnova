import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

// --- App setup ---
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3002;

// --- Keys ---
const HF_API_KEY = process.env.HF_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!HF_API_KEY) console.warn('[quiz-api] Warning: HF_API_KEY not defined');
if (!GEMINI_API_KEY) console.warn('[quiz-api] Warning: GEMINI_API_KEY not defined');

// --- Hugging Face clients & models ---
const hf = new HfInference(HF_API_KEY);
const MODEL_SUMMARIZATION = 'sshleifer/distilbart-cnn-12-6';
const MODEL_QA = 'deepset/roberta-base-squad2'; // stronger than distilbert SQuAD

// --- Gemini (AI Studio) client & model ---
// Use one of the models present in your /v1beta/models list (e.g., gemini-2.5-flash)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash';

async function generateWithGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  });
  return result?.response?.text() ?? '';
}

// --- Routes ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', model: GEMINI_MODEL_ID, time: new Date().toISOString() });
});

app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Missing text input' });

    const result = await hf.summarization({
      model: MODEL_SUMMARIZATION,
      inputs: text,
      parameters: {
        max_length: 150,
        min_length: 50,
        do_sample: false
      }
    });

    const summary = Array.isArray(result)
      ? (result[0]?.summary_text || '')
      : (result?.summary_text || '');

    res.json({ summary });
  } catch (err) {
    console.error('[summarize] error:', err);
    res.status(500).json({ error: err?.message || 'Summarization failed' });
  }
});

app.post('/api/qa', async (req, res) => {
  try {
    const { context, question } = req.body;
    if (!context?.trim() || !question?.trim()) {
      return res.status(400).json({ error: 'Missing context or question' });
    }

    const result = await hf.questionAnswering({
      model: MODEL_QA,
      inputs: { question, context }
    });

    res.json({
      answer: result?.answer ?? '',
      score: result?.score ?? null,
      start: result?.start ?? null,
      end: result?.end ?? null
    });
  } catch (err) {
    console.error('[qa] error:', err);
    res.status(500).json({ error: err?.message || 'QA failed' });
  }
});

app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { text, numQuestions } = req.body;
    const n = Number(numQuestions);
    if (!text?.trim() || !Number.isFinite(n) || n <= 0 || n > 25) {
      return res.status(400).json({ error: 'Missing/invalid text or number of questions (1–25)' });
    }

    const example = `[START OF EXAMPLE]\nContext: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.\nQuiz:\nQ: What is the Moon's status relative to Earth?\nA) A man-made satellite\nB) A natural satellite\nC) A dwarf planet\nD) A star\nAnswer: B\nQ: The dark areas on the Moon's surface are known as what?\nA) Craters\nB) Valleys\nC) Maria\nD) Highlands\nAnswer: C\n[END OF EXAMPLE]`;

    const prompt = `${example}\n\n[START OF TASK]\nContext: ${text}\n\nGenerate exactly ${n} multiple-choice questions in the same format.\nEach question must have 4 options (A–D) and indicate the correct Answer.\n\nQuiz:`;

    const quiz = await generateWithGemini(prompt);
    res.json({ model: GEMINI_MODEL_ID, quiz });
  } catch (err) {
    console.error('[quiz/generate] error:', err);
    res.status(500).json({ error: err?.message || 'Quiz generation failed' });
  }
});

app.post('/api/flashcards/generate', async (req, res) => {
  try {
    const { text, numFlashcards } = req.body;
    const n = Number(numFlashcards);
    if (!text?.trim() || !Number.isFinite(n) || n <= 0 || n > 50) {
      return res.status(400).json({ error: 'Missing/invalid text or number of flashcards (1–50)' });
    }

    const example = `[START OF EXAMPLE]\nContext: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.\nFlashcards:\nFlashcard 1:\nFront: What is Earth's only natural satellite?\nBack: The Moon\nFlashcard 2:\nFront: What are the dark areas on the Moon's surface called?\nBack: Maria\n[END OF EXAMPLE]`;

    const prompt = `${example}\n\n[START OF TASK]\nContext: ${text}\n\nGenerate exactly ${n} flashcards in the same format.\n\nFlashcards:`;

    const flashcards = await generateWithGemini(prompt);
    res.json({ model: GEMINI_MODEL_ID, flashcards });
  } catch (err) {
    console.error('[flashcards/generate] error:', err);
    res.status(500).json({ error: err?.message || 'Flashcard generation failed' });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
