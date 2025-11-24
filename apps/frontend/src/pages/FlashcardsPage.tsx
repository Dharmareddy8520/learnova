// src/pages/FlashcardsPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { RotateCcw, Save } from 'lucide-react'
import AppSidebar from '../components/AppSidebar' // ✅ add the global sidebar
import SaveContentModal from '../components/SaveContentModal'

type Flashcard = { front: string; back: string }

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
  if (Array.isArray(raw)) {
    return raw
      .map((c: any) => ({
        front: c.front ?? c.question ?? '',
        back: c.back ?? c.answer ?? '',
      }))
      .filter((c: Flashcard) => c.front || c.back)
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return normalizeFlashcards(parsed)
    } catch {
      const blocks = raw
        .split(/\n(?=Flashcard\s+\d+:)/i)
        .map((s) => s.trim())
        .filter(Boolean)

      const cards: Flashcard[] = []
      for (const b of blocks) {
        const f = b.match(/Front:\s*(.+)/i)?.[1]?.trim() || ''
        const back = b.match(/Back:\s*(.+)/i)?.[1]?.trim() || ''
        if (f || back) cards.push({ front: f, back })
      }
      return cards.length ? cards : [{ front: raw, back: '' }]
    }
  }
  return []
}

const FlashcardsPage: React.FC = () => {
  const [form, setForm] = useState({ text: '', numFlashcards: 10 })
  const [cards, setCards] = useState<Flashcard[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Save modal state
  const [saveModal, setSaveModal] = useState<{
    isOpen: boolean
    type: 'flashcard' | null
    content: any
    metadata?: any
  }>({
    isOpen: false,
    type: null,
    content: null,
    metadata: {},
  })

  const openSaveModal = () => {
    if (cards && cards.length > 0) {
      setSaveModal({
        isOpen: true,
        type: 'flashcard',
        content: cards,
        metadata: {
          itemCount: cards.length,
        },
      })
    }
  }

  const closeSaveModal = () => {
    setSaveModal({ isOpen: false, type: null, content: null, metadata: {} })
  }

  useEffect(() => {
    if (!cards) {
      setCards([
        { front: 'What is the capital of France?', back: 'Paris' },
        { front: '2 + 2 = ?', back: '4' },
        { front: 'Who wrote "Hamlet"?', back: 'William Shakespeare' },
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-indigo-700">
              ✨ Flashcard Generator
            </h1>
            {cards && cards.length > 0 && (
              <button
                onClick={openSaveModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md"
              >
                <Save className="h-4 w-4" />
                Save Flashcards ({cards.length})
              </button>
            )}
          </div>

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
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Generated Flashcards ({cards.length})
                </h2>
                <button
                  onClick={openSaveModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
                >
                  <Save className="h-4 w-4" />
                  Save All
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {cards.map((c, i) => (
                  <div
                    key={i}
                    className="group cursor-pointer rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="text-sm font-semibold text-indigo-600 mb-2">
                      Flashcard {i + 1}
                    </div>
                    <div className="text-gray-800 font-medium mb-1">{c.front}</div>
                    <div className="hidden group-hover:block text-sm text-gray-600 mt-2 transition">
                      <span className="font-semibold text-indigo-700">Answer:</span>{' '}
                      {c.back}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Save Content Modal */}
      {saveModal.isOpen && saveModal.type && (
        <SaveContentModal
          isOpen={saveModal.isOpen}
          onClose={closeSaveModal}
          type={saveModal.type}
          content={saveModal.content}
          metadata={saveModal.metadata}
        />
      )}
    </div>
  )
}

export default FlashcardsPage
