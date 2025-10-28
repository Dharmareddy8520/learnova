// src/pages/QuizGenerator.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Play, RotateCcw, ChevronRight } from 'lucide-react'
import AppSidebar from '../components/AppSidebar' // <-- use your working sidebar

type Question = {
  question: string
  choices: string[]
  answerIndex: number
}

/* ---------- shared styles (attractive inputs, no black border) ---------- */
const ui = {
  field:
    'relative border border-transparent rounded-xl px-4 pt-5 pb-2 bg-white shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-300 transition-all',
  label:
    'absolute -top-2 left-3 bg-white px-1 text-xs font-semibold text-indigo-600',
  input:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400',
  textarea:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none',
  select:
    'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800',
  btn: 'inline-flex items-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500',
  primary:
    'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md',
  ghost:
    'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 shadow-sm',
}

/* ---------------------- quiz normalization helpers ---------------------- */
function normalizeQuiz(raw: any): Question[] {
  if (Array.isArray(raw)) {
    return raw.map((q: any, i: number) => ({
      question: q.question || q.q || `Question ${i + 1}`,
      choices: q.options || q.choices || [],
      answerIndex:
        typeof q.answerIndex === 'number'
          ? q.answerIndex
          : typeof q.answerIdx === 'number'
          ? q.answerIdx
          : 0,
    }))
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return normalizeQuiz(parsed)
    } catch {
      // try to parse simple MCQ text "Q:, A) ... Answer: C"
      const blocks = raw
        .split(/\n(?=Q:|\d+\.)/i)
        .map((s) => s.trim())
        .filter(Boolean)

      const out: Question[] = []
      for (const b of blocks) {
        const qMatch = b.match(/Q:\s*(.+)/i) || b.match(/^\d+\.\s*(.+)/)
        if (!qMatch) continue
        const question = qMatch[1].trim()
        const choices = Array.from(b.matchAll(/^[A-D]\)\s*(.+)$/gim)).map((m) =>
          m[1].trim()
        )
        const ansMatch = b.match(/Answer:\s*([A-D])/i)
        let answerIndex = 0
        if (ansMatch) {
          const letter = ansMatch[1].toUpperCase()
          answerIndex = Math.max(0, 'ABCD'.indexOf(letter))
        }
        if (question && choices.length >= 2) {
          out.push({ question, choices, answerIndex })
        }
      }
      if (out.length) return out
      return [{ question: raw, choices: ['OK'], answerIndex: 0 }]
    }
  }

  return []
}

/* ----------------------- One-question-at-a-time UI ---------------------- */
function QuizPlayer({
  quiz,
  onRestart,
}: {
  quiz: Question[]
  onRestart: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<number[]>(Array(quiz.length).fill(-1))
  const choiceRefs = useRef<Array<HTMLButtonElement | null>>([])

  const q = quiz[idx]
  const finished = idx >= quiz.length
  const progress = Math.round((idx / quiz.length) * 100)

  useEffect(() => {
    choiceRefs.current[0]?.focus()
  }, [idx])

  const handleSubmit = () => {
    if (selected == null || locked) return
    setLocked(true)
    setAnswers((prev) => {
      const next = [...prev]
      next[idx] = selected
      return next
    })
    if (selected === q.answerIndex) setScore((s) => s + 1)
  }

  const next = () => {
    if (!locked) return
    const n = idx + 1
    if (n < quiz.length) {
      setIdx(n)
      setSelected(null)
      setLocked(false)
    } else {
      setIdx(quiz.length)
    }
  }

  const restart = () => {
    setIdx(0)
    setSelected(null)
    setLocked(false)
    setScore(0)
    setAnswers(Array(quiz.length).fill(-1))
    onRestart()
  }

  // Keyboard: 1..9 select, Enter submit/next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return
      if (!locked) {
        if (e.key >= '1' && e.key <= '9') {
          const n = Number(e.key) - 1
          if (n < q.choices.length) setSelected(n)
        }
        if (e.key === 'Enter') handleSubmit()
      } else {
        if (e.key === 'Enter' || e.key === ' ') next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, finished, q?.choices.length])

  if (finished) {
    const total = quiz.length
    const pct = Math.round((score / total) * 100)
    return (
      <div className="mt-6 rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Results</h2>
        <p className="text-gray-700 mb-4">
          Score: <span className="font-semibold">{score}</span> / {total} ({pct}
          %)
        </p>
        <div className="mb-6 h-3 w-full rounded bg-gray-200 overflow-hidden">
          <div className="h-3 bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>

        <details className="mb-6">
          <summary className="cursor-pointer select-none text-gray-800 font-medium">
            Review answers
          </summary>
          <ol className="mt-3 space-y-4 list-decimal pl-5">
            {quiz.map((qq, i) => {
              const user = answers[i]
              return (
                <li key={i} className="rounded-lg border p-3">
                  <div className="font-medium">{qq.question}</div>
                  <ul className="mt-2 space-y-1">
                    {qq.choices.map((c, ci) => {
                      const isCorrect = ci === qq.answerIndex
                      const isUser = ci === user
                      return (
                        <li
                          key={ci}
                          className={
                            'px-2 py-1 rounded ' +
                            (isCorrect
                              ? 'bg-green-50 text-green-700'
                              : isUser
                              ? 'bg-red-50 text-red-700'
                              : 'text-gray-700')
                          }
                        >
                          {String.fromCharCode(65 + ci)}. {c}
                          {isCorrect ? ' ✓' : isUser ? ' ✗' : ''}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ol>
        </details>

        <button onClick={restart} className={`${ui.btn} ${ui.primary} px-4 py-2`}>
          <RotateCcw className="h-4 w-4" />
          Restart
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Question {idx + 1} of {quiz.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
          <div className="h-2 bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">{q.question}</h2>

        <div className="grid gap-3">
          {q.choices.map((c, i) => {
            const isSelected = selected === i
            const showCorrect = locked && i === q.answerIndex
            const showWrong = locked && isSelected && i !== q.answerIndex

            const base =
              'w-full text-left rounded-lg px-4 py-3 ring-1 transition focus:outline-none focus:ring-2'
            const neutral = 'ring-gray-300 hover:bg-gray-50'
            const sel = 'ring-indigo-400 bg-indigo-50'
            const correct = 'ring-green-400 bg-green-50'
            const wrong = 'ring-red-400 bg-red-50'

            const stateClass = locked
              ? showCorrect
                ? correct
                : showWrong
                ? wrong
                : neutral
              : isSelected
              ? sel
              : neutral

            return (
              <button
                key={i}
                ref={(el) => (choiceRefs.current[i] = el)}
                className={`${base} ${stateClass}`}
                onClick={() => !locked && setSelected(i)}
                disabled={locked}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                {c}
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          {!locked ? (
            <button
              onClick={handleSubmit}
              disabled={selected == null}
              className={`${ui.btn} ${ui.primary} px-4 py-2`}
            >
              <Play className="h-4 w-4" />
              Submit
            </button>
          ) : (
            <button onClick={next} className={`${ui.btn} ${ui.primary} px-4 py-2`}>
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (!locked) {
                setLocked(true)
                setAnswers((prev) => {
                  const next = [...prev]
                  next[idx] = -1
                  return next
                })
              } else {
                next()
              }
            }}
            className={`${ui.btn} ${ui.ghost} px-4 py-2`}
          >
            Skip
          </button>

          <span className="ml-auto text-sm text-gray-600">
            Score: <span className="font-semibold">{score}</span>
          </span>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Tips: Press <kbd>1</kbd>…<kbd>9</kbd> to select · <kbd>Enter</kbd> to submit/next.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------ main page ------------------------------- */
const QuizGenerator = () => {
  const [formData, setFormData] = useState({
    text: '',
    numQuestions: 5,
    difficulty: 'medium',
  })
  const [quiz, setQuiz] = useState<Question[] | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [started, setStarted] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const payload = {
        text: formData.text,
        numQuestions: Number(formData.numQuestions) || 1,
      }
      const response = await axios.post('/api/quiz/generate', payload)
      const raw = response.data.quiz ?? response.data
      const normalized = normalizeQuiz(raw)
      if (!normalized.length) throw new Error('Quiz parsing failed')
      setQuiz(normalized)
      setStarted(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to generate quiz')
    } finally {
      setIsLoading(false)
    }
  }

  const onRestart = () => {
    setQuiz(null)
    setStarted(false)
  }

  const header = useMemo(
    () => (
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-3xl font-bold text-indigo-700 py-5 my-5">✨ Quiz Generator</h1>
        {started && (
          <span className="ml-2 text-xs rounded-full bg-indigo-50 text-indigo-700 px-2 py-1 ring-1 ring-indigo-200">
            Interactive mode
          </span>
        )}
      </div>
    ),
    [started]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global app sidebar (mobile drawer + desktop rail) */}
      <AppSidebar />

      {/* Content area: adjust padding to avoid overlap with the sidebar bars */}
      {/* If your desktop rail is w-64, keep md:ml-64. If it's w-16, change to md:ml-16 */}
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64 px-4 md:px-8">
        {header}

        {!started ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-gray-100 bg-white/70 backdrop-blur-sm p-6 shadow-md"
          >
            {/* Source text */}
            <div className={ui.field}>
              <label htmlFor="text" className={ui.label}>
                Source Text
              </label>
              <textarea
                id="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                rows={6}
                placeholder="Paste or write the content you want a quiz for..."
                className={ui.textarea}
              />
            </div>

            {/* Number of Questions */}
            <div className={ui.field}>
              <label htmlFor="numQuestions" className={ui.label}>
                Number of Questions (1–25)
              </label>
              <input
                id="numQuestions"
                name="numQuestions"
                type="number"
                min={1}
                max={25}
                value={formData.numQuestions}
                onChange={handleChange}
                placeholder="e.g. 5"
                className={ui.input}
              />
            </div>

            {/* Difficulty */}
            <div className={ui.field}>
              <label htmlFor="difficulty" className={ui.label}>
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className={ui.select}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className={`${ui.btn} ${ui.primary} px-6 py-2.5 text-white`}
              >
                {isLoading ? '✨ Generating…' : 'Generate Quiz'}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ text: '', numQuestions: 5, difficulty: 'medium' })}
                className={`${ui.btn} ${ui.ghost} px-6 py-2.5`}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>

            {error && <p className="text-red-600">{error}</p>}
          </form>
        ) : (
          <div className="mt-4">
            {quiz && <QuizPlayer quiz={quiz} onRestart={onRestart} />}
          </div>
        )}
      </main>
    </div>
  )
}

export default QuizGenerator
