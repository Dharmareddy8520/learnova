import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Trash2 } from 'lucide-react'
import { FolderManager } from '../components/FolderManager'

interface Folder {
  _id: string
  name: string
  description?: string
  color?: string
  cardIds: string[]
}

interface Card {
  _id: string
  title: string
  type: string
  content: any
  metadata: any
  createdAt: string
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children?: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-md text-sm font-medium ${active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'}`}
  >
    {children}
  </button>
)

export default function MyLibrary() {
  const [tab, setTab] = useState<'all' | 'folders' | 'cards' | 'uploads'>('all')
  const [counts, setCounts] = useState({ folders: 0, cards: 0, uploads: 0 })
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState<Folder[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [documents, setDocuments] = useState<Card[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  // Load counts on mount
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [f, c, u] = await Promise.all([
          axios.get('/api/folders/count').then(r => r.data.count).catch(() => 0),
          axios.get('/api/cards/count').then(r => r.data.count).catch(() => 0),
          axios.get('/api/documents/count').then(r => r.data.count).catch(() => 0),
        ])
        if (mounted) setCounts({ folders: f, cards: c, uploads: u })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // Load detailed content when tab changes
  useEffect(() => {
    let mounted = true
    const loadContent = async () => {
      setLoadingContent(true)
      setError(null)
      try {
        if (tab === 'folders' || tab === 'all') {
          const res = await axios.get('/api/folders')
          if (mounted) setFolders(res.data.folders || [])
        }
        if (tab === 'cards' || tab === 'all') {
          const res = await axios.get('/api/cards')
          if (mounted) setCards(res.data.cards || [])
        }
        if (tab === 'uploads' || tab === 'all') {
          const res = await axios.get('/api/documents')
          if (mounted) setDocuments(res.data.documents || [])
        }
      } catch (err: any) {
        if (mounted) setError(err.response?.data?.error || 'Failed to load content')
      } finally {
        if (mounted) setLoadingContent(false)
      }
    }
    loadContent()
    return () => { mounted = false }
  }, [tab])

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Delete this card?')) return
    try {
      await axios.delete(`/api/cards/${cardId}`)
      setCards(cards.filter(c => c._id !== cardId))
      setCounts(c => ({ ...c, cards: c.cards - 1 }))
    } catch (err: any) {
      alert('Failed to delete card: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Delete this document?')) return
    try {
      await axios.delete(`/api/documents/${docId}`)
      setDocuments(documents.filter(d => d._id !== docId))
      setCounts(c => ({ ...c, uploads: c.uploads - 1 }))
    } catch (err: any) {
      alert('Failed to delete document: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleMoveCardToFolder = async (cardId: string, folderId: string) => {
    try {
      await axios.post(`/api/folders/${folderId}/add-card`, { cardId })
      // Refresh folders to show updated card counts
      const res = await axios.get('/api/folders')
      setFolders(res.data.folders || [])
    } catch (err: any) {
      alert('Failed to move card: ' + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Library</h1>
        <div className="flex items-center gap-2">
          <TabButton active={tab === 'all'} onClick={() => setTab('all')}>All</TabButton>
          <TabButton active={tab === 'folders'} onClick={() => setTab('folders')}>Folders</TabButton>
          <TabButton active={tab === 'cards'} onClick={() => setTab('cards')}>My Cards</TabButton>
          <TabButton active={tab === 'uploads'} onClick={() => setTab('uploads')}>Uploads</TabButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Folders</div>
          <div className="text-2xl font-semibold">{loading ? '—' : counts.folders}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Cards</div>
          <div className="text-2xl font-semibold">{loading ? '—' : counts.cards}</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Uploads</div>
          <div className="text-2xl font-semibold">{loading ? '—' : counts.uploads}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm">
        {error && (
          <div className="text-sm text-red-600 mb-4 p-2 bg-red-50 rounded">
            Error: {error}
          </div>
        )}

        {tab === 'all' && (
          <div className="space-y-6">
            {loadingContent ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <>
                {folders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Folders ({folders.length})</h3>
                    <div className="space-y-2">
                      {folders.slice(0, 3).map(f => (
                        <div key={f._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{f.name}</span>
                          <span className="text-xs text-gray-500">{f.cardIds?.length || 0} cards</span>
                        </div>
                      ))}
                      {folders.length > 3 && <p className="text-xs text-gray-500">+{folders.length - 3} more</p>}
                    </div>
                  </div>
                )}
                {cards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Cards ({cards.length})</h3>
                    <div className="space-y-2">
                      {cards.slice(0, 3).map(c => (
                        <div key={c._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm truncate">{c.title}</span>
                          <span className="text-xs text-gray-500">Quizzes: {c.metadata?.quizCount || 0}</span>
                        </div>
                      ))}
                      {cards.length > 3 && <p className="text-xs text-gray-500">+{cards.length - 3} more</p>}
                    </div>
                  </div>
                )}
                {documents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">Uploads ({documents.length})</h3>
                    <div className="space-y-2">
                      {documents.slice(0, 3).map(d => (
                        <div key={d._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm truncate">{d.title}</span>
                          <span className="text-xs text-gray-500">{d.metadata?.fileSize || 0} bytes</span>
                        </div>
                      ))}
                      {documents.length > 3 && <p className="text-xs text-gray-500">+{documents.length - 3} more</p>}
                    </div>
                  </div>
                )}
                {folders.length === 0 && cards.length === 0 && documents.length === 0 && (
                  <p className="text-sm text-gray-500">Your library is empty. Start by uploading a document or creating a folder.</p>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'folders' && (
          <div>
            {loadingContent ? (
              <p className="text-sm text-gray-500">Loading folders...</p>
            ) : (
              <FolderManager />
            )}
          </div>
        )}

        {tab === 'cards' && (
          <div>
            {loadingContent ? (
              <p className="text-sm text-gray-500">Loading cards...</p>
            ) : cards.length > 0 ? (
              <div className="space-y-2">
                {cards.map(c => (
                  <div key={c._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-gray-500">Quiz: {c.metadata?.quizCount || 0} | Flashcards: {c.metadata?.flashcardCount || 0}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {/* Move to Folder Button */}
                      {folders.length > 0 && (
                        <div className="relative group/dropdown">
                          <button
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Move to folder"
                          >
                            📁
                          </button>
                          <div className="absolute right-0 mt-1 hidden group-hover/dropdown:block bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-max">
                            {folders.map(f => (
                              <button
                                key={f._id}
                                onClick={() => handleMoveCardToFolder(c._id, f._id)}
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {f.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteCard(c._id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete card"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No cards yet. Create one to start studying.</p>
            )}
          </div>
        )}

        {tab === 'uploads' && (
          <div>
            {loadingContent ? (
              <p className="text-sm text-gray-500">Loading uploads...</p>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map(d => (
                  <div key={d._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-gray-500">
                        Summary: {d.metadata?.summaryLength || 0} words | Quiz: {d.metadata?.quizCount || 0}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(d._id)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No uploads yet. Upload a file from the dashboard to get started.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
