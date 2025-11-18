// src/pages/FlashcardsPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { RotateCcw } from 'lucide-react'
import AppSidebar from '../components/AppSidebar' // ✅ add the global sidebar

// Flashcards are now simple important-point strings (no Q/A pairs)
type Flashcard = string;

const cls = {
  field:
    'relative border border-transparent rounded-xl px-4 pt-5 pb-2 bg-white shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-300 transition-all',
  label:
    'absolute -top-2 left-3 bg-white px-1 text-xs font-semibold text-indigo-600',
  input:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400',
  textarea:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none',
  btn: 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500',
  primary:
    'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md',
  ghost:
    'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 shadow-sm',
}

function normalizeFlashcards(raw: any): Flashcard[] {
  // Desired final shape: string[] where each entry is an important point.
  if (Array.isArray(raw)) {
    // If array of strings, return as-is (filter empties).
    if (raw.every((r) => typeof r === 'string')) {
      return raw.map((r) => (r || '').trim()).filter(Boolean);
    }

    // If array of objects (old shape), prefer front, then question, then answer.
    return raw
      .map((c: any) => String(c.front ?? c.question ?? c.back ?? c.answer ?? '').trim())
      .filter(Boolean);
  }

  if (typeof raw === 'string') {
    // Try JSON first
    try {
      const parsed = JSON.parse(raw);
      return normalizeFlashcards(parsed);
    } catch {
      // Heuristic: split by numbered / bullet blocks or Front:/Back: markers
      const byNumber = raw
        .split(/\n(?=\d+\.|Flashcard\s+\d+:|\-\s|\*\s)/i)
        .map((s) => s.trim())
        .filter(Boolean);

      if (byNumber.length > 1) {
        return byNumber.map((b) => {
          const front = b.match(/Front:\s*(.+)/i)?.[1]?.trim();
          if (front) return front;
          const back = b.match(/Back:\s*(.+)/i)?.[1]?.trim();
          if (back) return back;
          // Fallback to first line
          return b.split('\n')[0].trim();
        }).filter(Boolean);
      }

      // Last resort: return the whole text as one point
      const collapsed = raw.trim();
      return collapsed ? [collapsed] : [];
    }
  }

  return [];
}

const FlashcardsPage: React.FC = () => {
  const [form, setForm] = useState({ text: '', numFlashcards: 10 })
  const [cards, setCards] = useState<Flashcard[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cards) {
      setCards([
        'The Moon is Earth’s only natural satellite.',
        'It is the fifth largest satellite in the Solar System.',
        'The dark areas on its surface are called maria.',
        'The Moon has a diameter of 3474 km.'
      ])
    }
  }, [cards])

  const canGenerate = useMemo(
    () => form.text.trim().length > 0 && Number(form.numFlashcards) > 0,
    [form]
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canGenerate) return
    setLoading(true)
    setError('')

    try {
      const payload = {
        text: form.text,
        numFlashcards: Number(form.numFlashcards),
      }
      const res = await axios.post('/api/flashcards/generate', payload)
      const raw = res.data.flashcards ?? res.data
      const normalized = normalizeFlashcards(raw)
      if (!normalized.length) throw new Error('Could not parse flashcards')
      setCards(normalized)
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.message || 'Failed to generate flashcards'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* ✅ Global App Sidebar (mobile drawer + desktop rail) */}
      <AppSidebar />

      {/* ✅ Leave room for mobile top/bottom bars and the desktop rail */}
      {/* If your rail width differs, adjust md:ml-64 accordingly */}
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64">
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-indigo-700">
            ✨ Flashcard Generator
          </h1>

          <form
            onSubmit={handleGenerate}
            className="space-y-6 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-md"
          >
            {/* Source text */}
            <div className={cls.field}>
              <label htmlFor="text" className={cls.label}>
                Source Text
              </label>
              <textarea
                id="text"
                name="text"
                value={form.text}
                onChange={handleChange}
                rows={6}
                placeholder="Paste or write the content you want flashcards for..."
                className={cls.textarea}
              />
            </div>

            {/* Number of flashcards */}
            <div className={cls.field}>
              <label htmlFor="numFlashcards" className={cls.label}>
                Number of Flashcards
              </label>
              <input
                id="numFlashcards"
                name="numFlashcards"
                type="number"
                min={1}
                max={50}
                value={form.numFlashcards}
                onChange={handleChange}
                placeholder="e.g. 10"
                className={cls.input}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canGenerate || loading}
                className={`${cls.btn} ${cls.primary} px-6 py-2.5 text-white`}
              >
                {loading ? '✨ Generating…' : 'Generate Flashcards'}
              </button>

              <button
                type="button"
                onClick={() => setForm({ text: '', numFlashcards: 10 })}
                className={`${cls.btn} ${cls.ghost} px-6 py-2.5`}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-4 text-red-600 font-medium text-center bg-red-50 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Flashcards preview */}
          {cards && cards.length > 0 && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {cards.map((c, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="text-sm font-semibold text-indigo-600 mb-2">
                    Flashcard {i + 1}
                  </div>
                  <div className="text-gray-800 font-medium mb-1">{c}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default FlashcardsPage
