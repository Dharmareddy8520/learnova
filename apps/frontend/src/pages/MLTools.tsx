import React, { useState } from 'react'
import { summarize, quiz, flashcards } from '../services/ml'
import { useUsageLimits } from '../hooks/useUsageLimits'
import { useAuth } from '../contexts/AuthContext'
import QuizView from '../components/QuizView'
import FlashcardsView from '../components/FlashcardsView'
import usePageMeta from '../hooks/usePageMeta'

const MLTools: React.FC = () => {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryWarning, setSummaryWarning] = useState<string | null>(null)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [cards, setCards] = useState<any>(null)
  const [quizCount, setQuizCount] = useState<number>(5)
  const [flashCount, setFlashCount] = useState<number>(10)

  usePageMeta({
    title: 'Tools — Summarize, Quiz & Flashcards | Learnova',
    description: 'Run summaries, generate quizzes, and make flashcards from any text. Fast, accurate, and easy to use.',
    url: window.location.origin + '/tools',
  })

  const doSummarize = async () => {
    setLoading(true)
    setQuizResult(null)
    setCards(null)
    try {
      // enforce usage limits client-side for guests/demo: check before sending
      const feature = 'summarize'
      const { allowed, used, limit } = check(feature)
      if (!allowed) {
        try { window.dispatchEvent(new CustomEvent('usage:limit', { detail: { feature, used, limit } })) } catch (e) {}
        return
      }

      const MAX_SUMMARY_CHARS = 2000 // ~512 tokens (1k-2k chars) safe upper bound for Flan-T5-Large
      let payloadText = text
      if (text.length > MAX_SUMMARY_CHARS) {
        payloadText = text.slice(0, MAX_SUMMARY_CHARS)
        setSummaryWarning(`Input was truncated to ${MAX_SUMMARY_CHARS} characters to fit the model token limit.`)
      } else {
        setSummaryWarning(null)
      }

      const out = await summarize(payloadText)
      setSummary(out.summary || String(out))
      // increment usage for guests (server will handle logged-in users)
      if (!user) {
        try { await increment(feature) } catch (e) {}
      }
    } catch (e: any) {
      setSummary(`Error: ${e.message}`)
    } finally { setLoading(false) }
  }

  const doQuiz = async () => {
    setLoading(true)
    setSummary(null)
    setCards(null)
    try {
      const feature = 'quiz'
      const { allowed, used, limit } = check(feature)
      if (!allowed) {
        try { window.dispatchEvent(new CustomEvent('usage:limit', { detail: { feature, used, limit } })) } catch (e) {}
        return
      }

      const out = await quiz(text, quizCount)
      setQuizResult(out.quiz || out)
      if (!user) {
        try { await increment(feature) } catch (e) {}
      }
    } catch (e: any) {
      setQuizResult({ error: e.message })
    } finally { setLoading(false) }
  }

  const doFlashcards = async () => {
    setLoading(true)
    setSummary(null)
    setQuizResult(null)
    try {
      const feature = 'flashcards'
      const { allowed, used, limit } = check(feature)
      if (!allowed) {
        try { window.dispatchEvent(new CustomEvent('usage:limit', { detail: { feature, used, limit } })) } catch (e) {}
        return
      }

      const out = await flashcards(text, flashCount)
      setCards(out.flashcards || out)
      if (!user) {
        try { await increment(feature) } catch (e) {}
      }
    } catch (e: any) {
      setCards({ error: e.message })
    } finally { setLoading(false) }
  }

  // usage counters for display
  const { getUsed, getLimit, isUnlimited, check, increment } = useUsageLimits()
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">ML Tools</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full p-3 border rounded mb-4 h-48" />

      {summaryWarning && (
        <div className="mb-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          {summaryWarning}
        </div>
      )}

      <div className="flex gap-3 mb-4 items-center">
        <div className="flex items-center gap-2">
          <button onClick={doSummarize} className="btn btn-primary" disabled={loading || !text}>Summarize</button>
          <span className="text-sm text-gray-600">{isUnlimited('summarize') ? '∞' : `${getUsed('summarize')}/${getLimit('summarize')} used`}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={doQuiz} className="btn btn-secondary" disabled={loading || !text}>Generate Quiz</button>
          <span className="text-sm text-gray-600">{isUnlimited('quiz') ? '∞' : `${getUsed('quiz')}/${getLimit('quiz')} used`}</span>
          <label className="text-sm">Count</label>
          <input type="number" value={quizCount} min={1} max={20} onChange={(e) => setQuizCount(Number(e.target.value) || 1)} className="w-20 p-1 border rounded text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={doFlashcards} className="btn btn-outline" disabled={loading || !text}>Flashcards</button>
          <span className="text-sm text-gray-600">{isUnlimited('flashcards') ? '∞' : `${getUsed('flashcards')}/${getLimit('flashcards')} used`}</span>
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
