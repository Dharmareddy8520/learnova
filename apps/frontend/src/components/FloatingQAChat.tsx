import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { MessageCircle, X, Send, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Card {
  _id: string
  title: string
  type: string
  content: any
}

export function FloatingQAChat() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch cards on component mount (only for authenticated users)
  useEffect(() => {
    if (!user) return

    const fetchCards = async () => {
      try {
        const allCards: Card[] = []
        
        // Fetch personal cards
        try {
          const { data: cardsData } = await axios.get('/api/cards')
          console.log('📇 Personal cards fetched:', cardsData.cards?.length || 0)
          if (cardsData.cards?.length > 0) {
            allCards.push(...cardsData.cards)
          }
        } catch (err: any) {
          console.debug('Failed to fetch personal cards:', err.response?.status, err.message)
        }
        
        // Fetch uploaded documents
        try {
          const { data: docsResponse } = await axios.get('/api/documents')
          console.log('📄 Uploaded documents response:', docsResponse)
          const docsData = docsResponse.documents || docsResponse || []
          console.log('📄 Uploaded documents fetched:', docsData?.length || 0)
          if (docsData?.length > 0) {
            allCards.push(...docsData.map((doc: any) => ({
              _id: doc._id,
              title: doc.title || doc.filename || 'Uploaded Document',
              type: 'upload',
              content: {
                summary: doc.content?.summary || '',
                text: doc.content?.originalText || ''
              }
            })))
          }
        } catch (err: any) {
          console.debug('Failed to fetch documents:', err.response?.status, err.message)
        }
        
        console.log('✅ Total cards/documents loaded:', allCards.length)
        setCards(allCards)
        if (allCards.length > 0) {
          setSelectedCardId(allCards[0]._id)
        }
      } catch (err) {
        console.error('Failed to fetch cards:', err)
      }
    }
    fetchCards()
  }, [user])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Only show for authenticated users
  if (!user) {
    return null
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Get context from selected card
      let context = ''
      if (selectedCardId) {
        const card = cards.find(c => c._id === selectedCardId)
        if (card) {
          context = card.content?.summary || 
                   JSON.stringify(card.content).slice(0, 2000) || 
                   ''
        }
      }

      const response = await axios.post('/api/qa', {
        question: input,
        context: context,
      })

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.answer || 'No answer received',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: error?.response?.data?.error || 'Failed to get answer. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
          title="Ask Questions (QA)"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">Ask Questions</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Document Selector */}
          {cards.length > 0 && (
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Ask about:
              </label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {cards.map(card => (
                  <option key={card._id} value={card._id}>
                    {card.title.length > 40 ? card.title.slice(0, 40) + '...' : card.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {cards.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 px-4">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium">No documents yet</p>
                <p className="text-xs mt-2">Upload a document to start asking questions</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium">Start a conversation</p>
                <p className="text-xs mt-1">Ask questions about your cards</p>
              </div>
            ) : (
              <>
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl space-y-3">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="w-full text-xs py-1 text-gray-600 hover:text-gray-900 border-b border-gray-200 pb-2"
              >
                Clear chat
              </button>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={cards.length === 0 ? "Upload a document first..." : "Type your question..."}
                disabled={loading || cards.length === 0}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || cards.length === 0}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
