import React, { useState } from 'react'

type Choice = string
type Question = {
  question: string
  choices: Choice[]
  answerIndex: number
}

const QuizView: React.FC<{ quiz: Question[] }> = ({ quiz }) => {
  const [answers, setAnswers] = useState<number[]>(Array(quiz.length).fill(-1))
  const [showResults, setShowResults] = useState(false)

  const select = (qidx: number, cidx: number) => {
    const next = answers.slice()
    next[qidx] = cidx
    setAnswers(next)
  }

  const score = answers.reduce((s, a, i) => s + (a === quiz[i].answerIndex ? 1 : 0), 0)

  return (
    <div>
      {quiz.map((q, i) => (
        <div key={i} className="mb-4 p-3 border rounded bg-gray-50">
          <div className="font-semibold mb-2">{i + 1}. {q.question}</div>
          <div className="grid gap-2">
            {q.choices.map((c, ci) => (
              <button
                key={ci}
                className={`text-left p-2 rounded border ${answers[i]===ci? 'bg-blue-100 border-blue-300':''}`}
                onClick={() => select(i, ci)}
                disabled={showResults}
              >
                {String.fromCharCode(65+ci)}. {c}
              </button>
            ))}
          </div>
          {showResults && (
            <div className="mt-2 text-sm">
              Correct: <span className="font-medium">{String.fromCharCode(65+q.answerIndex)}</span>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-3 mt-4">
        <button className="btn btn-primary" onClick={() => setShowResults(true)}>Show Results</button>
        <div className="self-center">Score: <strong>{showResults ? `${score} / ${quiz.length}` : '—'}</strong></div>
      </div>
    </div>
  )
}

export default QuizView
