import React, { useState } from 'react'

type Question = {
  question: string
  choices: string[]
  answerIndex: number
}

const QuizRunner: React.FC<{ quiz: Question[]; onRestart?: () => void }> = ({ quiz, onRestart }) => {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>(Array(quiz.length).fill(-1))
  const [showScore, setShowScore] = useState(false)

  const select = (i: number) => {
    const next = answers.slice()
    next[index] = i
    setAnswers(next)
  }

  const next = () => {
    if (index < quiz.length - 1) setIndex(index + 1)
    else setShowScore(true)
  }

  const prev = () => {
    if (index > 0) setIndex(index - 1)
  }

  const score = answers.reduce((s, a, i) => s + (a === quiz[i].answerIndex ? 1 : 0), 0)

  if (!quiz || !quiz.length) return <div>No quiz available</div>

  if (showScore) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <h3 className="text-2xl font-bold mb-2">Your Score</h3>
        <p className="text-lg">{score} / {quiz.length}</p>
        <div className="mt-4">
          <button onClick={() => { setIndex(0); setAnswers(Array(quiz.length).fill(-1)); setShowScore(false); }} className="btn btn-outline mr-2">Retake</button>
          {onRestart && <button onClick={onRestart} className="btn btn-primary">New Quiz</button>}
        </div>
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Review</h4>
          {quiz.map((q, i) => (
            <div key={i} className="mb-3 p-2 border rounded bg-gray-50">
              <div className="font-medium">{i + 1}. {q.question}</div>
              <div className="text-sm mt-1">Your answer: {answers[i] >= 0 ? String.fromCharCode(65 + answers[i]) + '. ' + q.choices[answers[i]] : '—'}</div>
              <div className="text-sm">Correct: {String.fromCharCode(65 + q.answerIndex)}. {q.choices[q.answerIndex]}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const q = quiz[index]

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-gray-600">Question {index + 1} / {quiz.length}</div>
        <div className="text-sm text-gray-600">Progress: {Math.round(((index+1)/quiz.length)*100)}%</div>
      </div>

      <div className="mb-4">
        <div className="text-lg font-semibold mb-2">{q.question}</div>
        <div className="grid gap-2">
          {q.choices.map((c, ci) => (
            <button key={ci} onClick={() => select(ci)} className={`text-left p-3 rounded border ${answers[index]===ci? 'bg-blue-100 border-blue-300':''}`}>
              <strong className="mr-2">{String.fromCharCode(65+ci)}.</strong> {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div>
          <button onClick={prev} disabled={index===0} className="btn btn-outline mr-2">Previous</button>
          <button onClick={next} className="btn btn-primary">{index < quiz.length - 1 ? 'Next' : 'Finish'}</button>
        </div>
        <div className="text-sm text-gray-600">Selected: {answers[index] >= 0 ? String.fromCharCode(65 + answers[index]) : '—'}</div>
      </div>
    </div>
  )
}

export default QuizRunner
