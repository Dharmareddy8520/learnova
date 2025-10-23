import express from 'express';
import bodyParser from 'body-parser';
import { HfInference } from '@huggingface/inference';
import { TextServiceClient } from '@google-ai/generativelanguage';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    'W:/FINAL_LEARNOVA/apps/frontend/lear-475000-86e72f3005e9.json'
  );
  console.log('Set GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

const app = express();
app.use(bodyParser.json());

const HF_API_KEY = process.env.HF_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!HF_API_KEY) console.warn("Warning: HF_API_KEY not defined.");
if (!GEMINI_API_KEY) console.warn("Warning: GEMINI_API_KEY not defined.");

const hf = new HfInference(HF_API_KEY);
const MODEL_SUMMARIZATION = 'sshleifer/distilbart-cnn-12-6';
const MODEL_QA = 'distilbert-base-cased-distilled-squad';

const client = new TextServiceClient();

async function generateWithGeminiFlash(prompt) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured.');

  const request = {
    model: 'models/chat-bison-001', // Updated Gemini 1.5 flash model ID
    prompt: { text: prompt },
    temperature: 0.7,
    maxOutputTokens: 512,
  };

  const [response] = await client.generateText(request);
  return response?.candidates?.[0]?.output || '';
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text input' });

    const result = await hf.summarization({
      model: MODEL_SUMMARIZATION,
      inputs: text,
      parameters: {
        max_length: 150,
        min_length: 50,
        do_sample: false,
        early_stopping: true,
        num_beams: 4,
      },
    });

    const summary = Array.isArray(result) ? result[0]?.summary_text || '' : '';
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/qa', async (req, res) => {
  try {
    const { context, question } = req.body;
    if (!context || !question) return res.status(400).json({ error: 'Missing context or question' });

    const result = await hf.questionAnswering({
      model: MODEL_QA,
      inputs: {
        question: question,
        context: context
      }
    });

    res.json({ answer: result.answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quiz/generate', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured' });

    const { text, numQuestions } = req.body;
    if (!text || !numQuestions) return res.status(400).json({ error: 'Missing text or number of questions' });

    const example = `[START OF EXAMPLE]
Context: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.
Quiz:
Q: What is the Moon's status relative to Earth?
A) A man-made satellite
B) A natural satellite
C) A dwarf planet
D) A star
Answer: B
Q: The dark areas on the Moon's surface are known as what?
A) Craters
B) Valleys
C) Maria
D) Highlands
Answer: C
[END OF EXAMPLE]`;

    const promptText = `${example}\n\n[START OF TASK]\nContext: ${text}\n\nGenerate exactly ${numQuestions} multiple-choice questions in the same format. Each question must have 4 options (A-D) and indicate the correct Answer.\n\nQuiz:`;

    const quiz = await generateWithGeminiFlash(promptText);
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/flashcards/generate', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured' });

    const { text, numFlashcards } = req.body;
    if (!text || !numFlashcards) return res.status(400).json({ error: 'Missing text or number of flashcards' });

    const example = `[START OF EXAMPLE]
Context: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.
Flashcards:
Flashcard 1:
Front: What is Earth's only natural satellite?
Back: The Moon
Flashcard 2:
Front: What are the dark areas on the Moon's surface called?
Back: Maria
[END OF EXAMPLE]`;

    const promptText = `${example}\n\n[START OF TASK]\nContext: ${text}\n\nGenerate exactly ${numFlashcards} flashcards in the same format.\n\nFlashcards:`;

    const flashcards = await generateWithGeminiFlash(promptText);
    res.json({ flashcards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
