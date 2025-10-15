import axios from 'axios'

export async function summarize(text: string) {
  const res = await axios.post('/api/ml/summarize', { text })
  return res.data
}

export async function quiz(text: string, count = 5) {
  const res = await axios.post('/api/ml/quiz', { text, count })
  return res.data
}

export async function flashcards(text: string, count = 10) {
  const res = await axios.post('/api/ml/flashcards', { text, count })
  return res.data
}
