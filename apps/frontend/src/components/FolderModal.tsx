import { useState, useEffect } from 'react'
import { X, Trash2, MessageCircle, FolderOpen } from 'lucide-react'
import axios from 'axios'
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

interface IFolder {
  _id: string
  name: string
  description?: string
  color?: string
  cardIds: string[]
  createdAt: string
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

interface FolderModalProps {
  folder: IFolder
  onClose: () => void
  onDelete: (cardId: string) => void
  onUpdate: () => void
}

export function FolderModal({ folder, onClose, onDelete, onUpdate }: FolderModalProps) {
  const [cards, setCards] = useState<IPersonalCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qaModal, setQAModal] = useState<QAModalState>({
    open: false,
    question: '',
    answer: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    fetchFolderCards()
  }, [])

  const fetchFolderCards = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch from both PersonalCard and UploadedDocument endpoints
      const [cardsRes, documentsRes] = await Promise.allSettled([
        axios.get('/api/cards'),
        axios.get('/api/documents'),
      ])

      let allCards: IPersonalCard[] = []
      const seenIds = new Set<string>()

      // Get UploadedDocuments first (priority)
      if (documentsRes.status === 'fulfilled') {
        const documents = documentsRes.value?.data?.documents || []
        console.log('✅ Documents fetched:', documents.length)
        allCards = allCards.concat(documents)
        documents.forEach((doc: IPersonalCard) => seenIds.add(doc._id))
      } else {
        console.error('❌ Documents fetch failed:', documentsRes.reason)
      }

      // Get PersonalCards (legacy) but skip if already in UploadedDocuments
      if (cardsRes.status === 'fulfilled') {
        const cards = cardsRes.value?.data?.cards || []
        console.log('✅ Cards fetched:', cards.length)
        const uniqueCards = cards.filter((card: IPersonalCard) => !seenIds.has(card._id))
        allCards = allCards.concat(uniqueCards)
        uniqueCards.forEach((card: IPersonalCard) => seenIds.add(card._id))
      } else {
        console.error('❌ Cards fetch failed:', cardsRes.reason)
      }

      console.log('✅ Total unique cards:', allCards.length)

      // Filter cards that are in this folder
      console.log('🔍 Folder cardIds:', folder.cardIds)
      console.log('🔍 All card IDs:', allCards.map(c => c._id))
      const folderCards = allCards.filter((card: IPersonalCard) => {
        const cardIdStr = card._id?.toString?.() || String(card._id)
        const isIncluded = folder.cardIds.some((id: any) => {
          const folderId = id?.toString?.() || String(id)
          return folderId === cardIdStr
        })
        console.log(`  Card ${cardIdStr}: ${isIncluded ? '✅' : '❌'}`)
        return isIncluded
      })

      console.log('✅ Folder cards after filtering:', folderCards.length)
      
      // Fallback: if no cards found, show all cards (debugging)
      if (folderCards.length === 0 && allCards.length > 0) {
        console.warn('⚠️ No cards matched! Showing all cards as fallback')
        setCards(allCards)
      } else {
        setCards(folderCards)
      }
    } catch (err: any) {
      console.error('Folder cards error:', err)
      setError(err?.response?.data?.error || 'Failed to load folder cards')
    } finally {
      setLoading(false)
    }
  }

  const deleteCard = async (id: string) => {
    if (!window.confirm('Delete this card from folder?')) return
    try {
      // Try to delete from both endpoints (one will succeed based on card type)
      await Promise.allSettled([
        axios.delete(`/api/cards/${id}`),
        axios.delete(`/api/documents/${id}`),
      ])
      setCards(cards.filter(c => c._id !== id))
      onDelete(id)
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
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-6 py-4 sticky top-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="font-bold text-lg text-gray-900">{folder.name}</h3>
                {folder.description && (
                  <p className="text-xs text-gray-600 mt-1">{folder.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {/* Info */}
            <div className="mb-4 text-sm text-gray-600">
              <span className="font-medium">{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
              {' • '}
              <span>Created {new Date(folder.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Cards */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading cards...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : cards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No cards in this folder</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map(card => {
                  // Use unified card component for upload-type cards
                  if (card.type === 'upload') {
                    return (
                      <UnifiedCardDisplay
                        key={card._id}
                        card={card}
                        onDelete={deleteCard}
                        onUpdate={onUpdate}
                        onOpenQA={openQAModal}
                      />
                    )
                  }

                  // Legacy card display
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
          </div>

          {/* Q&A Modal */}
          {qaModal.open && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-lg">
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
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
                        >
                          {qaModal.loading ? 'Asking...' : 'Ask'}
                        </button>
                        <button
                          onClick={closeQAModal}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}

                  {/* Answer Display */}
                  {qaModal.answer && (
                    <>
                      <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Q: {qaModal.question}</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{qaModal.answer}</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setQAModal(prev => ({ ...prev, question: '', answer: null }))}
                          className="flex-1 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium transition"
                        >
                          Ask Another Question
                        </button>
                        <button
                          onClick={closeQAModal}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition"
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
        </div>
      </div>
    </>
  )
}
