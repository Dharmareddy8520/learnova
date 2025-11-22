import { useEffect, useState } from 'react'
import axios from 'axios'
import { Trash2, MessageCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { CardDetailModal } from './CardDetailModal'
import { UnifiedCardDisplay } from './UnifiedCardDisplay'

interface IPersonalCard {
  _id: string
  title: string
  type: 'summary' | 'quiz' | 'flashcards' | 'qa' | 'upload' | string
  content: any
  metadata?: Record<string, any>
  createdAt: string
  folderId?: string
}

type QAModalState = {
  open: boolean
  cardId?: string
  context?: string
  question: string
  answer: string | null
  loading: boolean
  error: string | null
}

export function PersonalDashboard() {
  const [cards, setCards] = useState<IPersonalCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const [selectedCard, setSelectedCard] = useState<IPersonalCard | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [qaModal, setQAModal] = useState<QAModalState>({
    open: false,
    question: '',
    answer: null,
    loading: false,
    error: null,
  })

  // Fetch personal cards on mount and when location changes (user navigates back)
  useEffect(() => {
    fetchCards()
  }, [location.pathname])

  // Listen for card moved event from FolderManager
  useEffect(() => {
    const handleCardMoved = () => {
      fetchCards()
    }
    window.addEventListener('cardMoved', handleCardMoved)
    return () => window.removeEventListener('cardMoved', handleCardMoved)
  }, [])

  const fetchCards = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('📌 PersonalDashboard: Fetching cards...')
      
      // First try to fetch UploadedDocuments (new structure)
      let uploadedCards = []
      try {
        const { data: uploadedData } = await axios.get('/api/documents')
        uploadedCards = uploadedData.documents || []
        console.log('✅ Fetched', uploadedCards.length, 'uploaded documents')
      } catch (err: any) {
        console.error('❌ Failed to fetch documents:', err?.response?.status, err?.response?.data?.error)
      }

      // Also fetch legacy PersonalCards for backward compatibility
      let legacyCards = []
      try {
        const { data: cardsData } = await axios.get('/api/cards')
        legacyCards = cardsData.cards || []
        console.log('✅ Fetched', legacyCards.length, 'legacy cards')
      } catch (err: any) {
        console.error('❌ Failed to fetch cards:', err?.response?.status, err?.response?.data?.error)
      }

      // Combine both (uploaded documents first, then legacy cards)
      const allCards = [...uploadedCards, ...legacyCards]
      console.log('✅ Total cards:', allCards.length)
      setCards(allCards)
      
      if (allCards.length === 0) {
        setError('No cards found. Upload a document to get started!')
      }
    } catch (err: any) {
      console.error('❌ Fetch cards error:', err)
      setError(err?.response?.data?.error || 'Failed to load cards')
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  const deleteCard = async (id: string) => {
    if (!window.confirm('Delete this card?')) return
    try {
      // Try to delete as UploadedDocument first
      await axios.delete(`/api/documents/${id}`).catch(async () => {
        // Fallback to delete as PersonalCard
        await axios.delete(`/api/cards/${id}`)
      })
      setCards(cards.filter(c => c._id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete card')
    }
  }

  const openQAModal = (card: IPersonalCard) => {
    const context = card.content?.summary || card.content?.quiz || JSON.stringify(card.content)
    setQAModal({
      open: true,
      cardId: card._id,
      context: String(context).slice(0, 2000),
      question: '',
      answer: null,
      loading: false,
      error: null,
    })
  }

  const submitQA = async () => {
    if (!qaModal.question.trim()) {
      setQAModal(prev => ({ ...prev, error: 'Please enter a question' }))
      return
    }

    setQAModal(prev => ({ ...prev, loading: true, error: null }))
    try {
      const { data } = await axios.post('/api/qa', {
        question: qaModal.question,
        context: qaModal.context,
      })
      setQAModal(prev => ({ ...prev, answer: data.answer, loading: false }))
    } catch (err: any) {
      setQAModal(prev => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.error || 'QA failed',
      }))
    }
  }

  const closeQAModal = () => {
    setQAModal({
      open: false,
      question: '',
      answer: null,
      loading: false,
      error: null,
    })
  }

  // Card type icon & color
  const getCardStyle = (type: string) => {
    const styles: Record<string, { bg: string; border: string; label: string }> = {
      summary: { bg: 'bg-blue-50', border: 'border-blue-200', label: '📝 Summary' },
      quiz: { bg: 'bg-purple-50', border: 'border-purple-200', label: '❓ Quiz' },
      flashcards: { bg: 'bg-yellow-50', border: 'border-yellow-200', label: '🎴 Flashcards' },
      qa: { bg: 'bg-green-50', border: 'border-green-200', label: '💬 Q&A' },
      upload: { bg: 'bg-indigo-50', border: 'border-indigo-200', label: '📁 Upload' },
    }
    return styles[type] || styles.upload
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Cards</h2>
        <p className="text-sm text-gray-600 mt-1">AI-generated cards and results</p>
      </div>

      {/* Refresh Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={fetchCards}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 text-sm font-medium transition"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Loading */}
      {loading && <div className="text-center py-12 text-gray-500">Loading your cards...</div>}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 mb-6">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && cards.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No cards or documents</h3>
          <p className="text-gray-600 mb-6">Upload a document to get AI-generated summaries, quizzes, and flashcards</p>
          <a
            href="/tools"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Go to Document Analyzer
          </a>
        </div>
      )}

      {/* Cards Grid */}
      {!loading && cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            // Use unified card component for upload-type cards
            if (card.type === 'upload') {
              return (
                <UnifiedCardDisplay
                  key={card._id}
                  card={card}
                  onDelete={deleteCard}
                  onUpdate={() => fetchCards()}
                  onOpenQA={openQAModal}
                />
              )
            }

            // Legacy card display for other types
            const style = getCardStyle(card.type)
            const displayTitle = card.title.slice(0, 50) + (card.title.length > 50 ? '...' : '')
            const dateStr = new Date(card.createdAt).toLocaleDateString()

            return (
              <div
                key={card._id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('cardId', card._id)
                }}
                onClick={() => {
                  setSelectedCard(card)
                  setDetailModalOpen(true)
                }}
                className={`rounded-lg border-2 ${style.border} ${style.bg} p-4 transition hover:shadow-md cursor-grab active:cursor-grabbing`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-600">{style.label}</div>
                    <h3 className="font-semibold text-gray-900 text-sm mt-1">{displayTitle}</h3>
                  </div>
                </div>

                {/* Card Preview */}
                <div className="bg-white/60 rounded-lg p-2 mb-3 min-h-[60px] max-h-[100px] overflow-hidden">
                  <p className="text-xs text-gray-700 line-clamp-3">
                    {card.content?.summary || JSON.stringify(card.content).slice(0, 100)}...
                  </p>
                </div>

                {/* Card Date */}
                <div className="text-xs text-gray-500 mb-3">{dateStr}</div>

                {/* Card Actions */}
                <div className="flex gap-2">
                  {card.type !== 'qa' && (
                    <button
                      onClick={() => openQAModal(card)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-indigo-100 text-indigo-700 px-3 py-2 text-xs font-medium hover:bg-indigo-200 transition"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Ask
                    </button>
                  )}
                  <button
                    onClick={() => deleteCard(card._id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-100 text-red-700 px-3 py-2 text-xs font-medium hover:bg-red-200 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QA Modal */}
      {qaModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Ask a Question</h3>
              <button
                onClick={closeQAModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Question Input */}
              {!qaModal.answer && (
                <>
                  <textarea
                    value={qaModal.question}
                    onChange={(e) =>
                      setQAModal(prev => ({ ...prev, question: e.target.value, error: null }))
                    }
                    placeholder="Ask a question about this card..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-400 focus:outline-none focus:ring-0"
                  />
                  {qaModal.error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      {qaModal.error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={submitQA}
                      disabled={qaModal.loading}
                      className="flex-1 rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {qaModal.loading ? 'Answering...' : 'Get Answer'}
                    </button>
                    <button
                      onClick={closeQAModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* Answer Display */}
              {qaModal.answer && (
                <>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-600">Your Question:</div>
                    <p className="text-gray-900">{qaModal.question}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-600">Answer:</div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-gray-900 whitespace-pre-wrap">
                      {qaModal.answer}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        setQAModal(prev => ({
                          ...prev,
                          answer: null,
                          question: '',
                          error: null,
                        }))
                      }
                      className="flex-1 rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700"
                    >
                      Ask Another Question
                    </button>
                    <button
                      onClick={closeQAModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal 
        card={selectedCard} 
        isOpen={detailModalOpen} 
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedCard(null)
        }}
      />
    </div>
  )
}
