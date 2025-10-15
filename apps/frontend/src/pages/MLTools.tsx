import React, { useState } from 'react'
import { summarize, quiz, flashcards } from '../services/ml'
import QuizView from '../components/QuizView'
import FlashcardsView from '../components/FlashcardsView'

const MLTools: React.FC = () => {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [cards, setCards] = useState<any>(null)
  const [quizCount, setQuizCount] = useState<number>(5)
  const [flashCount, setFlashCount] = useState<number>(10)

  const doSummarize = async () => {
    setLoading(true)
    setQuizResult(null)
    setCards(null)
    try {
      const out = await summarize(text)
      setSummary(out.summary || String(out))
    } catch (e: any) {
      setSummary(`Error: ${e.message}`)
    } finally { setLoading(false) }
  }

  const doQuiz = async () => {
    setLoading(true)
    setSummary(null)
    setCards(null)
    try {
      const out = await quiz(text, quizCount)
      setQuizResult(out.quiz || out)
    } catch (e: any) {
      setQuizResult({ error: e.message })
    } finally { setLoading(false) }
  }

  const doFlashcards = async () => {
    setLoading(true)
    setSummary(null)
    setQuizResult(null)
    try {
      const out = await flashcards(text, flashCount)
      setCards(out.flashcards || out)
    } catch (e: any) {
      setCards({ error: e.message })
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">ML Tools</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full p-3 border rounded mb-4 h-48" />

      <div className="flex gap-3 mb-4 items-center">
        <button onClick={doSummarize} className="btn btn-primary" disabled={loading || !text}>Summarize</button>

        <div className="flex items-center gap-2">
          <button onClick={doQuiz} className="btn btn-secondary" disabled={loading || !text}>Generate Quiz</button>
          <label className="text-sm">Count</label>
          <input type="number" value={quizCount} min={1} max={20} onChange={(e) => setQuizCount(Number(e.target.value) || 1)} className="w-20 p-1 border rounded text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={doFlashcards} className="btn btn-outline" disabled={loading || !text}>Flashcards</button>
          <label className="text-sm">Count</label>
          <input type="number" value={flashCount} min={1} max={50} onChange={(e) => setFlashCount(Number(e.target.value) || 1)} className="w-20 p-1 border rounded text-sm" />
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow min-h-[6rem]">
        {loading ? <div>Loading…</div> : (
          summary ? (
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="whitespace-pre-wrap">{summary}</div>
            </div>
          ) : quizResult ? (
            Array.isArray(quizResult) ? <QuizView quiz={quizResult} /> : <pre>{JSON.stringify(quizResult, null, 2)}</pre>
          ) : cards ? (
            Array.isArray(cards) ? <FlashcardsView cards={cards} /> : <pre>{JSON.stringify(cards, null, 2)}</pre>
          ) : (
            <div>No result yet</div>
          )
        )}
      </div>
    </div>
  )
}

export default MLTools
