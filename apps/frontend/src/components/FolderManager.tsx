import { useEffect, useState } from 'react'
import axios from 'axios'
import { Folder, Plus, Trash2, Edit2, X } from 'lucide-react'
import { FolderModal } from './FolderModal'

interface IFolder {
  _id: string
  name: string
  description?: string
  color?: string
  cardIds: string[]
  createdAt: string
}

export function FolderManager() {
  const [folders, setFolders] = useState<IFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDesc, setNewFolderDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [selectedFolderForModal, setSelectedFolderForModal] = useState<IFolder | null>(null)

  const colors = [
    'bg-blue-100',
    'bg-red-100',
    'bg-green-100',
    'bg-yellow-100',
    'bg-purple-100',
    'bg-pink-100',
  ]
  const [selectedColor, setSelectedColor] = useState(colors[0])

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get('/api/folders')
      setFolders(data.folders || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load folders')
    } finally {
      setLoading(false)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Folder name is required')
      return
    }

    try {
      const { data } = await axios.post('/api/folders', {
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
        color: selectedColor,
      })
      setFolders([data.folder, ...folders])
      setNewFolderName('')
      setNewFolderDesc('')
      setSelectedColor(colors[0])
      setShowCreateForm(false)
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create folder')
    }
  }

  const updateFolder = async (folderId: string) => {
    if (!editName.trim()) {
      alert('Folder name is required')
      return
    }

    try {
      const { data } = await axios.put(`/api/folders/${folderId}`, {
        name: editName.trim(),
      })
      setFolders(folders.map(f => (f._id === folderId ? data.folder : f)))
      setEditingId(null)
      setEditName('')
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update folder')
    }
  }

  const deleteFolder = async (folderId: string) => {
    if (!window.confirm('Delete this folder? Cards inside will be unfolded.')) return

    try {
      await axios.delete(`/api/folders/${folderId}`)
      setFolders(folders.filter(f => f._id !== folderId))
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete folder')
    }
  }

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    // Get folder element and cursor position
    const folderElement = document.getElementById(`folder-${folderId}`)
    if (folderElement) {
      const rect = folderElement.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      
      // Check if cursor is within folder bounds
      const isOverlapping = (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      )
      
      if (isOverlapping) {
        setDragOverFolderId(folderId)
      } else {
        setDragOverFolderId(null)
      }
    }
  }

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    setDragOverFolderId(null)
    
    const cardId = e.dataTransfer.getData('cardId')
    if (!cardId) return

    try {
      const { data } = await axios.post(`/api/folders/${folderId}/add-card`, { cardId })
      setFolders(folders.map(f => (f._id === folderId ? data.folder : f)))
      // Refresh folders to get accurate card counts
      setTimeout(() => fetchFolders(), 300)
      // Notify parent to refresh cards
      window.dispatchEvent(new Event('cardMoved'))
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to move card to folder')
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading folders...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Folders</h2>
      </div>

      {/* New Folder Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
        >
          <Plus className="h-4 w-4" />
          New Folder
        </button>
      </div>

      {/* Create Folder Form */}
      {showCreateForm && (
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Create New Folder</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <textarea
              placeholder="Description (optional)"
              value={newFolderDesc}
              onChange={(e) => setNewFolderDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
              rows={2}
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-lg ${color} border-2 transition ${
                      selectedColor === color ? 'border-gray-900' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createFolder}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                Create Folder
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-3 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Folders Grid */}
      {folders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
          <Folder className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No folders yet. Create your first folder to organize cards!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {folders.map((folder) => (
            <div
              key={folder._id}
              id={`folder-${folder._id}`}
              onDragOver={(e) => handleDragOver(e, folder._id)}
              onDrop={(e) => handleDropOnFolder(e, folder._id)}
              className={`p-3 rounded-lg border-2 transition cursor-drop ${
                dragOverFolderId === folder._id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:shadow-md'
              } ${folder.color || 'bg-white'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  {editingId === folder._id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateFolder(folder._id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                  ) : (
                    <h3 className="font-semibold text-gray-900 flex-1 truncate text-sm">{folder.name}</h3>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {editingId === folder._id ? (
                    <>
                      <button
                        onClick={() => updateFolder(folder._id)}
                        className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-0.5 text-gray-400 hover:bg-gray-200 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(folder._id)
                          setEditName(folder.name)
                        }}
                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteFolder(folder._id)}
                        className="p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {folder.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{folder.description}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 border-opacity-50">
                {folder.cardIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center min-w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                      {folder.cardIds.length}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      card{folder.cardIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedFolderForModal(folder)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View Folder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Folder Modal */}
      {selectedFolderForModal && (
        <FolderModal
          folder={selectedFolderForModal}
          onClose={() => setSelectedFolderForModal(null)}
          onDelete={() => fetchFolders()}
          onUpdate={() => fetchFolders()}
        />
      )}
    </div>
  )
}
