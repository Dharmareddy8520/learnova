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

  if (!quiz || !quiz.length) return <div className="text-xs text-gray-500">No quiz available</div>

  if (showScore) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
        <div className="text-center mb-3">
          <h3 className="text-sm font-bold text-gray-900">Your Score</h3>
          <p className="text-lg font-bold text-purple-600 mt-1">{score}/{quiz.length}</p>
          <p className="text-xs text-gray-600 mt-1">({Math.round((score/quiz.length)*100)}% correct)</p>
        </div>
        <div className="flex gap-2 justify-center mb-3">
          <button 
            onClick={() => { setIndex(0); setAnswers(Array(quiz.length).fill(-1)); setShowScore(false); }} 
            className="text-xs px-3 py-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition font-medium"
          >
            Retake
          </button>
          {onRestart && <button 
            onClick={onRestart} 
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition font-medium"
          >
            Close
          </button>}
        </div>
      </div>
    )
  }

  const q = quiz[index]

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="flex justify-between items-center text-xs text-gray-600">
        <span>Q{index + 1}/{quiz.length}</span>
        <div className="flex-1 mx-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all" 
            style={{ width: `${((index + 1) / quiz.length) * 100}%` }}
          />
        </div>
        <span>{Math.round(((index+1)/quiz.length)*100)}%</span>
      </div>

      {/* Question */}
      <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-200">
        <p className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{q.question}</p>
        
        {/* Options */}
        <div className="space-y-1.5">
          {q.choices.map((c, ci) => (
            <button 
              key={ci} 
              onClick={() => select(ci)} 
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded border-2 transition ${
                answers[index]===ci 
                  ? 'bg-purple-200 border-purple-400 text-gray-900 font-medium' 
                  : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
            >
              <strong className="mr-1.5">{String.fromCharCode(65+ci)}.</strong> 
              <span className="line-clamp-1">{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center gap-2 pt-1">
        <button 
          onClick={prev} 
          disabled={index===0} 
          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
        >
          ← Prev
        </button>
        <div className="text-xs text-gray-600 text-center flex-1">
          {answers[index] >= 0 ? `Selected: ${String.fromCharCode(65 + answers[index])}` : 'Not answered'}
        </div>
        <button 
          onClick={next} 
          className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition font-medium"
        >
          {index < quiz.length - 1 ? 'Next →' : 'Finish'}
        </button>
      </div>
    </div>
  )
}

export default QuizRunner
