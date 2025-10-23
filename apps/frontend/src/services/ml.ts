import axios from 'axios'

// Ensure cookies are sent for cross-site requests when using the dev proxy or when
// frontend is hosted on a different origin. Can be overridden per-request.
axios.defaults.withCredentials = true

export async function summarize(text: string) {
  const res = await axios.post('/api/summarize', { text })
  return res.data
}

export async function quiz(text: string, count = 5) {
  const res = await axios.post('/api/quiz/generate', { text, numQuestions: count })
  return res.data
}

export async function flashcards(text: string, count = 10) {
  const res = await axios.post('/api/flashcards/generate', { text, numFlashcards: count })
  return res.data
}
