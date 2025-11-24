import React, { useState } from 'react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface SaveContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'summary' | 'quiz' | 'flashcard' | 'qa';
  content: any;
  onSave?: () => void;
  metadata?: {
    originalFileName?: string;
    wordCount?: number;
    itemCount?: number;
  };
}

/**
 * SaveContentModal Component
 * 
 * Modal dialog for saving generated summaries, quizzes, flashcards, or Q&A to the database.
 * Features:
 * - Title and description input fields
 * - Validation before saving
 * - Loading and error states
 * - Success feedback
 */
const SaveContentModal: React.FC<SaveContentModalProps> = ({
  isOpen,
  onClose,
  type,
  content,
  onSave,
  metadata = {},
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/saved-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          content,
          metadata,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save content');
      }

      const data = await response.json();
      console.log('Content saved:', data);

      // Show success
      setSuccess(true);
      
      // Call optional callback
      if (onSave) {
        onSave();
      }

      // Close modal after brief delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving content:', err);
      setError(err.message || 'Failed to save content');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const typeLabels = {
    summary: 'Summary',
    quiz: 'Quiz',
    flashcard: 'Flashcards',
    qa: 'Q&A History',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Save {typeLabels[type]}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span>Content saved successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`My ${typeLabels[type]}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || success}
              maxLength={200}
            />
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or context about this content..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isLoading || success}
              maxLength={1000}
            />
          </div>

          {/* Metadata Info */}
          {(metadata.originalFileName || metadata.wordCount || metadata.itemCount) && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              {metadata.originalFileName && (
                <div>Original file: {metadata.originalFileName}</div>
              )}
              {metadata.wordCount && (
                <div>Word count: {metadata.wordCount}</div>
              )}
              {metadata.itemCount && (
                <div>
                  {type === 'quiz' && `Questions: ${metadata.itemCount}`}
                  {type === 'flashcard' && `Cards: ${metadata.itemCount}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || success || !title.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveContentModal;
