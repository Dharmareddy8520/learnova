import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Trash2, MessageCircle, FolderOpen } from 'lucide-react'
import { UnifiedCardDisplay } from '../components/UnifiedCardDisplay'

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

export default function FolderView() {
  const { folderId } = useParams<{ folderId: string }>()
  const navigate = useNavigate()
  const [folder, setFolder] = useState<IFolder | null>(null)
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
    if (folderId) {
      fetchFolderAndCards()
    }
  }, [folderId])

  const fetchFolderAndCards = async () => {
    if (!folderId) return
    setLoading(true)
    setError(null)
    try {
      // Fetch folder details
      const { data: folderData } = await axios.get(`/api/folders/${folderId}`)
      const folderInfo = folderData.folder

      // The folder should contain populated cardIds, but let's fetch full card details
      // by getting all cards and filtering by cardIds
      const { data: allCardsData } = await axios.get('/api/cards').catch(() => ({ data: { cards: [] } }))
      const allCards = allCardsData.cards || []

      // Filter cards that are in this folder
      const folderCards = allCards.filter((card: IPersonalCard) => 
        folderInfo.cardIds.includes(card._id)
      )

      setFolder(folderInfo)
      setCards(folderCards)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load folder')
    } finally {
      setLoading(false)
    }
  }

  const deleteCard = async (id: string) => {
    if (!window.confirm('Delete this card?')) return
    try {
      await axios.delete(`/api/cards/${id}`).catch(async () => {
        await axios.delete(`/api/documents/${id}`)
      })
      setCards(cards.filter(c => c._id !== id))
      // Update folder to remove the card
      if (folder) {
        setFolder({
          ...folder,
          cardIds: folder.cardIds.filter(cid => cid !== id),
        })
      }
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-500">Loading folder...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      </div>
    )
  }

  if (!folder) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Folder not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Folder Header */}
      <div className={`rounded-xl p-6 mb-6 ${folder.color || 'bg-indigo-50'} border-2 border-indigo-200`}>
        <div className="flex items-start gap-4">
          <FolderOpen className="h-8 w-8 text-indigo-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{folder.name}</h1>
            {folder.description && (
              <p className="text-gray-600 mt-2">{folder.description}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              <span>📊 {cards.length} card{cards.length !== 1 ? 's' : ''}</span>
              <span>📅 Created {new Date(folder.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">This folder is empty</p>
          <p className="text-gray-500 text-sm mt-2">Drag cards from "My Cards" to this folder</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            // Use unified card component for upload-type cards
            if (card.type === 'upload') {
              return (
                <UnifiedCardDisplay
                  key={card._id}
                  card={card}
                  onDelete={deleteCard}
                  onUpdate={() => fetchFolderAndCards()}
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
  )
}
