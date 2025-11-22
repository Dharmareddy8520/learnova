import { useState } from 'react'
import axios from 'axios'
import { X, Loader, MessageSquare, BookMarked, FileText } from 'lucide-react'

interface ICard {
  _id: string
  title: string
  type: 'summary' | 'quiz' | 'flashcards' | 'upload' | string
  content: any
  metadata?: Record<string, any>
  createdAt: string
  folderId?: string
}

interface CardDetailModalProps {
  card: ICard | null
  isOpen: boolean
  onClose: () => void
}

export function CardDetailModal({ card, isOpen, onClose }: CardDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'actions'>('content')
  const [summaryLength, setSummaryLength] = useState(100)
  const [adjustedSummary, setAdjustedSummary] = useState<string | null>(null)
  const [generatedFlashcards, setGeneratedFlashcards] = useState<any[] | null>(null)
  const [qaResults, setQaResults] = useState<any[] | null>(null)
  const [numQuestions, setNumQuestions] = useState(5)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !card) return null

  const getCardStyleLabel = (type: string) => {
    const styles: Record<string, string> = {
      summary: 'Summary',
      quiz: 'Quiz',
      flashcards: 'Flashcards',
      upload: 'Upload',
    }
    return styles[type] || type
  }

  const renderContent = () => {
    switch (card.type) {
      case 'summary':
        return <p className="text-gray-700 leading-relaxed">{card.content?.summary || 'No summary available'}</p>

      case 'quiz':
        if (Array.isArray(card.content)) {
          return (
            <div className="space-y-4">
              {card.content.map((q: any, idx: number) => (
                <div key={idx} className="border-l-4 border-indigo-400 bg-indigo-50 p-4 rounded">
                  <p className="font-semibold text-gray-900 mb-2">
                    {idx + 1}. {q.question || q.prompt || 'Question'}
                  </p>
                  {q.options && Array.isArray(q.options) && (
                    <ul className="space-y-1 ml-4">
                      {q.options.map((opt: string, optIdx: number) => (
                        <li key={optIdx} className="text-sm text-gray-700">
                          {String.fromCharCode(97 + optIdx)}) {opt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.answer && (
                    <p className="text-sm text-green-700 font-medium mt-2">
                      Answer: {q.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        }
        return <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded overflow-auto">{JSON.stringify(card.content, null, 2)}</pre>

      case 'flashcards':
        if (Array.isArray(card.content)) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {card.content.map((fc: any, idx: number) => (
                <div key={idx} className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-600 mb-2">Front</div>
                  <p className="font-medium text-gray-900 mb-4">{fc.front || 'Front'}</p>
                  <div className="text-sm font-semibold text-gray-600 mb-2">Back</div>
                  <p className="text-gray-700">{fc.back || 'Back'}</p>
                </div>
              ))}
            </div>
          )
        }
        return <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded overflow-auto">{JSON.stringify(card.content, null, 2)}</pre>

      default:
        if (typeof card.content === 'string') {
          return <p className="text-gray-700">{card.content}</p>
        }
        return <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded overflow-auto">{JSON.stringify(card.content, null, 2)}</pre>
    }
  }

  const handleAdjustSummary = async () => {
    if (card.type !== 'summary') return
    setLoading(true)
    setError(null)
    try {
      const lengthFactor = summaryLength / 100
      const prompt = `Please provide a summary of this text with approximately ${Math.round(100 * lengthFactor)} words:

${card.content?.summary || ''}`

      const { data } = await axios.post('/api/ml/summarize', {
        text: prompt,
      })

      setAdjustedSummary(data.summary)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to adjust summary')
    } finally {
      setLoading(false)
    }
  }

  const handleAskMoreQuestions = async () => {
    if (!card.content?.summary && card.type !== 'summary') return
    setLoading(true)
    setError(null)
    try {
      const context = card.type === 'summary' ? card.content?.summary : card.content?.summary || ''

      const { data } = await axios.post('/api/ml/qa', {
        context,
        questions: Array(numQuestions)
          .fill(0)
          .map((_, i) => `Generate question ${i + 1} about this content`),
      })

      setQaResults(data.answers || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!card.content?.summary && card.type !== 'summary') return
    setLoading(true)
    setError(null)
    try {
      const context = card.type === 'summary' ? card.content?.summary : card.content?.summary || ''

      const { data } = await axios.post('/api/ml/flashcards', {
        text: context,
        count: 10,
      })

      setGeneratedFlashcards(data.flashcards || data || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate flashcards')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
              {getCardStyleLabel(card.type)}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{card.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{new Date(card.createdAt).toLocaleString()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-3 font-medium text-sm transition ${
              activeTab === 'content'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Content
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-3 font-medium text-sm transition ${
              activeTab === 'actions'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Actions
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'content' && (
            <div className="space-y-4">
              {renderContent()}
              {adjustedSummary && (
                <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Adjusted Summary ({summaryLength}%)</h4>
                  <p className="text-blue-800">{adjustedSummary}</p>
                </div>
              )}
              {generatedFlashcards && generatedFlashcards.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Generated Flashcards</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedFlashcards.map((fc: any, idx: number) => (
                      <div key={idx} className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                        <p className="font-medium text-gray-900 mb-2">{fc.front || fc.question}</p>
                        <p className="text-gray-700 text-sm">{fc.back || fc.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {qaResults && qaResults.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Generated Q&A</h4>
                  <div className="space-y-3">
                    {qaResults.map((qa: any, idx: number) => (
                      <div key={idx} className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded">
                        <p className="font-medium text-gray-900">{qa.question || `Q${idx + 1}`}</p>
                        <p className="text-gray-700 mt-2">{qa.answer || qa}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {error}
                </div>
              )}

              {/* Adjust Summary */}
              {card.type === 'summary' && (
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Adjust Summary Length</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Length: {summaryLength}%
                      </label>
                      <input
                        type="range"
                        min="25"
                        max="150"
                        value={summaryLength}
                        onChange={(e) => setSummaryLength(Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">25% = very brief, 150% = very detailed</p>
                    </div>
                    <button
                      onClick={handleAdjustSummary}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {loading && <Loader className="w-4 h-4 animate-spin" />}
                      {loading ? 'Generating...' : 'Generate Adjusted Summary'}
                    </button>
                  </div>
                </div>
              )}

              {/* Generate Flashcards */}
              {(card.type === 'summary' || card.type === 'quiz') && (
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookMarked className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-900">Generate Flashcards</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Create study flashcards from this content</p>
                  <button
                    onClick={handleGenerateFlashcards}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                    {loading ? 'Generating...' : 'Generate Flashcards'}
                  </button>
                </div>
              )}

              {/* Ask More Questions */}
              {(card.type === 'summary' || card.type === 'quiz') && (
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Ask More Questions</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Questions: {numQuestions}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <button
                      onClick={handleAskMoreQuestions}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {loading && <Loader className="w-4 h-4 animate-spin" />}
                      {loading ? 'Generating...' : 'Generate Questions'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                💡 Tip: Use these actions to deepen your learning and create study materials!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
