import React, { useEffect, useState } from 'react'
import axios from 'axios'

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
        {tab === 'all' && (
          <div>
            <p className="text-sm text-gray-600">All library items will be listed here. You can filter by tab to view folders, cards or uploads.</p>
          </div>
        )}

        {tab === 'folders' && (
          <div>
            <p className="text-sm text-gray-600">Folder manager and folder contents will appear here.</p>
          </div>
        )}

        {tab === 'cards' && (
          <div>
            <p className="text-sm text-gray-600">Your cards will be listed here. You can edit, delete or move cards to folders.</p>
          </div>
        )}

        {tab === 'uploads' && (
          <div>
            <p className="text-sm text-gray-600">Uploaded documents, statuses and actions will be shown here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
