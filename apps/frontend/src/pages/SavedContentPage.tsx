import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  FileText,
  BookOpen,
  Layers,
  AlertCircle,
  Loader2,
  Calendar,
  X,
  MessageSquare,
} from 'lucide-react';
import { downloadContent } from '../utils/downloadUtils';
import AppSidebar from '../components/AppSidebar';

interface SavedItem {
  _id: string;
  title: string;
  description?: string;
  type: 'summary' | 'quiz' | 'flashcard' | 'qa';
  content: any;
  metadata?: {
    originalFileName?: string;
    wordCount?: number;
    itemCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * SavedContentPage Component
 * 
 * Main page for viewing, searching, and managing saved content (summaries, quizzes, flashcards).
 * Features:
 * - List all saved items with pagination
 * - Search by title/description
 * - Filter by type
 * - View content details
 * - Download as file
 * - Delete items
 */
const SavedContentPage: React.FC = () => {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'summary' | 'quiz' | 'flashcard'>('all');
  
  // View modal
  const [viewingItem, setViewingItem] = useState<SavedItem | null>(null);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, summary: 0, quiz: 0, flashcard: 0, qa: 0 });

  // Calculate stats from items
  useEffect(() => {
    const newStats = {
      total: items.length,
      summary: items.filter(item => item.type === 'summary').length,
      quiz: items.filter(item => item.type === 'quiz').length,
      flashcard: items.filter(item => item.type === 'flashcard').length,
      qa: items.filter(item => item.type === 'qa').length,
    };
    setStats(newStats);
  }, [items]);

  // Fetch all saved content
  const fetchSavedContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/saved-content');
      setItems(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching saved content:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load saved content');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await axios.delete(`/api/saved-content/${id}`);

      // Remove from local state
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err: any) {
      console.error('Error deleting item:', err);
      alert(err.response?.data?.error || err.message || 'Failed to delete item');
    }
  };

  // Download item
  const handleDownload = (item: SavedItem) => {
    downloadContent(item.content, item.type, item.title);
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...items];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  }, [items, typeFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchSavedContent();
  }, []);;

  const typeIcons = {
    summary: FileText,
    quiz: BookOpen,
    flashcard: Layers,
    qa: MessageSquare,
  };

  const typeColors = {
    summary: 'bg-green-100 text-green-800',
    quiz: 'bg-purple-100 text-purple-800',
    flashcard: 'bg-indigo-100 text-indigo-800',
    qa: 'bg-orange-100 text-orange-800',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global App Sidebar */}
      <AppSidebar />

      {/* Main content with sidebar spacing */}
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Content</h1>
            <p className="text-gray-600">
              Manage your saved summaries, quizzes, and flashcards
            </p>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer">
            <div className="text-sm text-gray-600 mb-1 font-medium">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-4 border border-green-200 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer">
            <div className="text-sm text-green-700 mb-1 font-medium">Summaries</div>
            <div className="text-2xl font-bold text-green-900">{stats.summary}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-4 border border-purple-200 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer">
            <div className="text-sm text-purple-700 mb-1 font-medium">Quizzes</div>
            <div className="text-2xl font-bold text-purple-900">{stats.quiz}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-sm p-4 border border-indigo-200 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer">
            <div className="text-sm text-indigo-700 mb-1 font-medium">Flashcards</div>
            <div className="text-2xl font-bold text-indigo-900">{stats.flashcard}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm p-4 border border-orange-200 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer">
            <div className="text-sm text-orange-700 mb-1 font-medium">Q&A</div>
            <div className="text-2xl font-bold text-orange-900">{stats.qa || 0}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="summary">Summaries</option>
                <option value="quiz">Quizzes</option>
                <option value="flashcard">Flashcards</option>
                <option value="qa">Q&A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading saved content...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchQuery || typeFilter !== 'all'
                ? 'No items match your search criteria'
                : 'No saved content yet. Start by analyzing a document!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
              const Icon = typeIcons[item.type];
              return (
                <div
                  key={item._id}
                  className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          typeColors[item.type]
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingItem(item)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-1 text-gray-600 hover:text-green-600 transition"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1 text-gray-600 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    {item.metadata?.itemCount && (
                      <div>
                        {item.type === 'quiz' && `${item.metadata.itemCount} questions`}
                        {item.type === 'flashcard' && `${item.metadata.itemCount} cards`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Modal */}
        {viewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {React.createElement(typeIcons[viewingItem.type], {
                    className: 'h-6 w-6 text-gray-600',
                  })}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {viewingItem.title}
                    </h2>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        typeColors[viewingItem.type]
                      }`}
                    >
                      {viewingItem.type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingItem(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {viewingItem.description && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{viewingItem.description}</p>
                  </div>
                )}

                <div className="prose max-w-none">
                  {viewingItem.type === 'summary' && (
                    <div className="whitespace-pre-wrap">{viewingItem.content}</div>
                  )}

                  {viewingItem.type === 'quiz' && Array.isArray(viewingItem.content) && (
                    <div className="space-y-4">
                      {viewingItem.content.map((q: any, i: number) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4">
                          <div className="font-semibold mb-2">
                            {i + 1}. {q.question || q.q}
                          </div>
                          {(q.options || q.choices) && (
                            <div className="space-y-1 ml-4">
                              {(q.options || q.choices).map((opt: string, j: number) => (
                                <div
                                  key={j}
                                  className={
                                    j === q.correct ? 'text-green-700 font-medium' : ''
                                  }
                                >
                                  {String.fromCharCode(65 + j)}. {opt}
                                  {j === q.correct && ' ✓'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {viewingItem.type === 'flashcard' &&
                    Array.isArray(viewingItem.content) && (
                      <div className="space-y-4">
                        {viewingItem.content.map((card: any, i: number) => (
                          <div
                            key={i}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="font-semibold mb-2">
                              Front: {card.front || card.question}
                            </div>
                            <div className="text-gray-700">
                              Back: {card.back || card.answer}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {viewingItem.type === 'qa' && Array.isArray(viewingItem.content) && (
                    <div className="space-y-4">
                      {viewingItem.content.map((item: any, i: number) => (
                        <div key={i} className="space-y-2">
                          <div className="bg-indigo-100 text-indigo-900 px-4 py-2 rounded-lg">
                            <strong>Q:</strong> {item.question}
                          </div>
                          <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                            <strong>A:</strong> {item.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => handleDownload(viewingItem)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default SavedContentPage;
