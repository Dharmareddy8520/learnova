import React, { useState } from 'react'
import axios from 'axios'
import { Brain, Loader2 } from 'lucide-react'

interface QuizQuestion {
  question: string
  options: string[]
  answer: string
}

const QuizGenerator: React.FC = () => {
  const [text, setText] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({})
  const [showResults, setShowResults] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setQuiz(null)
    setSelectedAnswers({})
    setShowResults(false)

    try {
      const response = await axios.post(
        '/api/quiz/generate',
        {
          text,
          numQuestions,
          difficulty
        },
        {
          withCredentials: true
        }
      )
      setQuiz(response.data)
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else if (err.response?.status === 401) {
        setError('Please login to generate quizzes')
      } else {
        setError('Failed to generate quiz. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    if (!showResults) {
      setSelectedAnswers({
        ...selectedAnswers,
        [questionIndex]: answer
      })
    }
  }

  const calculateScore = () => {
    if (!quiz?.questions) return 0
    let correct = 0
    quiz.questions.forEach((q: QuizQuestion, index: number) => {
      if (selectedAnswers[index] === q.answer) {
        correct++
      }
    })
    return correct
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Quiz Generator</h1>
          </div>
          <p className="text-gray-600">
            Generate custom quizzes from any text. Enter your content below and let AI create questions for you.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                Text Content
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={8}
                placeholder="Paste your text here..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <input
                  id="numQuestions"
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="w-full bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                'Generate Quiz'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Quiz Display */}
        {quiz && quiz.questions && quiz.questions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Quiz</h2>
              <p className="text-gray-600">
                {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} • {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
              </p>
            </div>

            <div className="space-y-6">
              {quiz.questions.map((question: QuizQuestion, index: number) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {index + 1}. {question.question}
                  </h3>
                  <div className="space-y-2">
                    {question.options.map((option: string, optionIndex: number) => {
                      const isSelected = selectedAnswers[index] === option
                      const isCorrect = option === question.answer
                      const showCorrect = showResults && isCorrect
                      const showIncorrect = showResults && isSelected && !isCorrect

                      return (
                        <button
                          key={optionIndex}
                          onClick={() => handleAnswerSelect(index, option)}
                          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                            showCorrect
                              ? 'border-green-500 bg-green-50'
                              : showIncorrect
                              ? 'border-red-500 bg-red-50'
                              : isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${showResults ? 'cursor-default' : 'cursor-pointer'}`}
                          disabled={showResults}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
                          {option}
                          {showCorrect && (
                            <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                          )}
                          {showIncorrect && (
                            <span className="ml-2 text-red-600 font-medium">✗ Incorrect</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            {!showResults && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowResults(true)}
                  disabled={Object.keys(selectedAnswers).length !== quiz.questions.length}
                  className="w-full bg-green-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Quiz
                </button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Answered {Object.keys(selectedAnswers).length} of {quiz.questions.length} questions
                </p>
              </div>
            )}

            {/* Results */}
            {showResults && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz Complete!</h3>
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {calculateScore()} / {quiz.questions.length}
                  </p>
                  <p className="text-gray-600">
                    You got {Math.round((calculateScore() / quiz.questions.length) * 100)}% correct
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuizGenerator
