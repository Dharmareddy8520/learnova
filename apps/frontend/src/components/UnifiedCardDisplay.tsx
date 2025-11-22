import { useState } from 'react'
import { ChevronDown, ChevronUp, Edit2, RotateCcw, Trash2, MessageCircle, X } from 'lucide-react'
import axios from 'axios'
import QuizRunner from './QuizRunner'

interface UnifiedCardProps {
  card: any
  onDelete: (id: string) => void
  onUpdate: (id: string) => void
  onOpenQA: (card: any) => void
}

export function UnifiedCardDisplay({ card, onDelete, onUpdate, onOpenQA }: UnifiedCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const hasSummary = !!card.content?.summary
  const hasQuiz = !!card.content?.quiz && Array.isArray(card.content.quiz) && card.content.quiz.length > 0
  const hasFlashcards = !!card.content?.flashcards && Array.isArray(card.content.flashcards) && card.content.flashcards.length > 0

  return (
    <>
      {/* Compact Card Preview */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('cardId', card._id)
        }}
        onClick={() => setIsModalOpen(true)}
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 p-4 cursor-move hover:shadow-lg hover:scale-105 transition-all duration-200 active:opacity-80"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-xs font-semibold text-indigo-700 uppercase">📁 Upload</div>
            <h3 className="font-bold text-base text-gray-900 mt-1 line-clamp-2">{card.title}</h3>
            <p className="text-xs text-gray-600 mt-1">{new Date(card.createdAt).toLocaleDateString()}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(card._id)
            }}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
            title="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Content Summary */}
        <div className="space-y-1 text-xs">
          {hasSummary && (
            <div className="flex items-center gap-2 text-gray-700">
              <span>📝 Summary</span>
              <span className="text-gray-500">({card.metadata?.summaryLength || 0}w)</span>
            </div>
          )}
          {hasQuiz && (
            <div className="flex items-center gap-2 text-gray-700">
              <span>❓ Quiz</span>
              <span className="text-gray-500">({card.metadata?.quizCount || 0}q)</span>
            </div>
          )}
          {hasFlashcards && (
            <div className="flex items-center gap-2 text-gray-700">
              <span>🎴 Cards</span>
              <span className="text-gray-500">({card.metadata?.flashcardCount || 0})</span>
            </div>
          )}
        </div>

        {/* Click to expand hint */}
        <div className="mt-3 text-xs text-indigo-600 font-medium">Click to edit →</div>
      </div>

      {/* Full Card Modal */}
      {isModalOpen && (
        <ExpandedCardModal
          card={card}
          onClose={() => setIsModalOpen(false)}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onOpenQA={onOpenQA}
        />
      )}
    </>
  )
}

function ExpandedCardModal({ card, onClose, onDelete, onUpdate, onOpenQA }: any) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: false,
    quiz: false,
    flashcards: false,
  })

  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    summary: false,
    quiz: false,
    flashcards: false,
  })

  const [editValues, setEditValues] = useState<Record<string, number>>({
    summaryLength: card.metadata?.summaryLength || 200,
    quizCount: card.metadata?.quizCount || 8,
    flashcardCount: card.metadata?.flashcardCount || 12,
  })

  const [updating, setUpdating] = useState<Record<string, boolean>>({
    summary: false,
    quiz: false,
    flashcards: false,
  })

  const [isQuizRunning, setIsQuizRunning] = useState(false)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleEditMode = (section: string) => {
    if (editMode[section]) {
      const key = section === 'summary' ? 'summaryLength' : section === 'quiz' ? 'quizCount' : 'flashcardCount'
      setEditValues(prev => ({ ...prev, [key]: card.metadata?.[key] || (section === 'summary' ? 200 : section === 'quiz' ? 8 : 12) }))
    }
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleUpdateContent = async (section: string) => {
    const fieldMap = {
      summary: { field: 'summaryLength', key: 'summaryLength' },
      quiz: { field: 'quizCount', key: 'quizCount' },
      flashcards: { field: 'flashcardCount', key: 'flashcardCount' },
    }

    const config = fieldMap[section as keyof typeof fieldMap]
    if (!config) return

    const value = editValues[config.key]
    setUpdating(prev => ({ ...prev, [section]: true }))

    try {
      // For UploadedDocuments, use the regenerate endpoint
      // For PersonalCards, use the update endpoint
      if (card.type === 'upload') {
        console.log(`Calling /api/documents/${card._id}/regenerate with field=${config.field}, value=${value}`)
        await axios.patch(`/api/documents/${card._id}/regenerate`, {
          field: config.field,
          value,
        })
      } else {
        console.log(`Calling /api/cards/${card._id}/update with field=${config.field}, value=${value}`)
        await axios.patch(`/api/cards/${card._id}/update`, {
          field: config.field,
          value,
        })
      }

      onUpdate(card._id)
      setEditMode(prev => ({ ...prev, [section]: false }))
    } catch (err: any) {
      console.error(`Failed to update ${section}:`, err)
      alert(err?.response?.data?.error || `Failed to update ${section}`)
    } finally {
      setUpdating(prev => ({ ...prev, [section]: false }))
    }
  }

  const hasSummary = !!card.content?.summary
  const hasQuiz = !!card.content?.quiz && Array.isArray(card.content.quiz) && card.content.quiz.length > 0
  const hasFlashcards = !!card.content?.flashcards && Array.isArray(card.content.flashcards) && card.content.flashcards.length > 0

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between sticky top-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{card.title}</h3>
            <p className="text-xs text-gray-600 mt-1">{new Date(card.createdAt).toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => onClose()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] divide-y divide-gray-200">
          {/* Summary Section */}
          <SectionContent
            title="📝 Summary"
            color="blue"
            expanded={expandedSections.summary}
            onToggle={() => toggleSection('summary')}
            editMode={editMode.summary}
            onToggleEdit={() => toggleEditMode('summary')}
            updating={updating.summary}
            onUpdate={() => handleUpdateContent('summary')}
            editValue={editValues.summaryLength}
            onEditChange={(val: number) => setEditValues(prev => ({ ...prev, summaryLength: val }))}
            metadata={card.metadata?.summaryLength}
            editLabel="📝 Number of Words"
            editMin={50}
            editMax={1000}
            unit="words"
            isEmpty={!hasSummary}
          >
            {hasSummary ? (
              <p className="text-gray-700 text-sm">{card.content.summary}</p>
            ) : (
              <p className="text-gray-500 text-sm italic">No summary yet. Click edit to create one.</p>
            )}
          </SectionContent>

          {/* Quiz Section */}
          <SectionContent
            title="❓ Quiz"
            color="purple"
            expanded={expandedSections.quiz}
            onToggle={() => toggleSection('quiz')}
            editMode={editMode.quiz}
            onToggleEdit={() => toggleEditMode('quiz')}
            updating={updating.quiz}
            onUpdate={() => handleUpdateContent('quiz')}
            editValue={editValues.quizCount}
            onEditChange={(val: number) => setEditValues(prev => ({ ...prev, quizCount: val }))}
            metadata={card.metadata?.quizCount}
            editLabel="❓ Number of Questions"
            editMin={0}
            editMax={50}
            unit="questions"
            isEmpty={!hasQuiz}
            allowTakeQuiz={hasQuiz}
            onTakeQuiz={() => setIsQuizRunning(true)}
          >
            {isQuizRunning && hasQuiz ? (
              <QuizRunnerWrapper
                quiz={card.content.quiz}
                onFinish={() => setIsQuizRunning(false)}
              />
            ) : hasQuiz ? (
              <div className="space-y-3">
                {Array.isArray(card.content.quiz) && card.content.quiz.map((q: any, i: number) => (
                  <div key={i} className="border-l-4 border-purple-300 pl-3">
                    <p className="font-medium text-sm text-gray-900">Q{i + 1}: {q.question || q.prompt || '...'}</p>
                    {q.options && q.options.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        Options: {q.options.map((opt: string, idx: number) => <div key={idx}>• {opt}</div>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No quiz yet. Click edit to create one.</p>
            )}
          </SectionContent>

          {/* Flashcards Section */}
          <SectionContent
            title="🎴 Flashcards"
            color="yellow"
            expanded={expandedSections.flashcards}
            onToggle={() => toggleSection('flashcards')}
            editMode={editMode.flashcards}
            onToggleEdit={() => toggleEditMode('flashcards')}
            updating={updating.flashcards}
            onUpdate={() => handleUpdateContent('flashcards')}
            editValue={editValues.flashcardCount}
            onEditChange={(val: number) => setEditValues(prev => ({ ...prev, flashcardCount: val }))}
            metadata={card.metadata?.flashcardCount}
            editLabel="🎴 Number of Flashcards"
            editMin={0}
            editMax={100}
            unit="flashcards"
            isEmpty={!hasFlashcards}
          >
            {hasFlashcards ? (
              <div className="space-y-2">
                {Array.isArray(card.content.flashcards) && card.content.flashcards.map((fc: any, i: number) => {
                  const [front, back] = typeof fc === 'string' ? fc.split(':').map(s => s.trim()) : [fc.front || fc.term || '?', fc.back || fc.definition || '?']
                  return (
                    <div key={i} className="text-sm">
                      <span className="text-gray-900">{front}</span>
                      <span className="text-gray-500"> • </span>
                      <span className="text-gray-600">{back}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No flashcards yet. Click edit to create one.</p>
            )}
          </SectionContent>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-2">
          <button
            onClick={() => onOpenQA(card)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-100 text-indigo-700 px-4 py-2 text-sm font-medium hover:bg-indigo-200 transition"
          >
            <MessageCircle className="w-4 h-4" />
            Ask Question
          </button>
          <button
            onClick={() => {
              onDelete(card._id)
              onClose()
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-100 text-red-700 px-4 py-2 text-sm font-medium hover:bg-red-200 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Reusable section component
function SectionContent({
  title,
  color,
  expanded,
  onToggle,
  editMode,
  onToggleEdit,
  updating,
  onUpdate,
  editValue,
  onEditChange,
  metadata,
  editLabel,
  editMin,
  editMax,
  unit,
  isEmpty = false,
  children,
  allowTakeQuiz = false,
  onTakeQuiz,
}: any) {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-600' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-600' },
  }

  const style = colorMap[color] || colorMap.blue

  return (
    <div className={`border-l-4 ${style.border}`}>
      <button
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between hover:${style.bg} transition`}
      >
        <div className="flex items-center gap-3">
          <div>
            <h4 className="font-semibold text-gray-900 text-left flex items-center gap-2">
              {title}
              {isEmpty && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Not created</span>}
            </h4>
            {metadata && <p className="text-xs text-gray-600 mt-1">{metadata} {unit || 'items'}</p>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {expanded && (
        <div className={`px-6 pb-4 ${style.bg}`}>
          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{editLabel}</label>
                <input
                  type="number"
                  min={editMin}
                  max={editMax}
                  value={editValue}
                  onChange={(e) => onEditChange(Math.max(editMin, parseInt(e.target.value) || editMin))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <p className="text-xs text-gray-600 mt-2">Range: {editMin} - {editMax}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate()}
                  disabled={updating}
                  className={`flex-1 flex items-center justify-center gap-2 ${style.text} bg-white border-2 border-current px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-60 transition`}
                >
                  <RotateCcw className="w-4 h-4" />
                  {isEmpty ? (updating ? 'Creating...' : 'Create') : (updating ? 'Regenerating...' : 'Regenerate')}
                </button>
                <button
                  onClick={onToggleEdit}
                  disabled={updating}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 max-h-48 overflow-y-auto">{children}</div>
              <div className="flex gap-2">
                {allowTakeQuiz && (
                  <button
                    onClick={onTakeQuiz}
                    className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition bg-purple-100 text-purple-700 hover:bg-purple-200`}
                  >
                    ▶️ Take Quiz
                  </button>
                )}
                <button
                  onClick={onToggleEdit}
                  className={`${allowTakeQuiz ? 'flex-1' : ''} flex items-center gap-2 text-sm ${style.text} hover:opacity-80 font-medium`}
                >
                  <Edit2 className="w-4 h-4" />
                  {isEmpty ? 'Create' : 'Edit'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Wrapper component to convert quiz format and handle QuizRunner
function QuizRunnerWrapper({ quiz, onFinish }: { quiz: any[]; onFinish: () => void }) {
  // Convert quiz questions to QuizRunner format
  const convertedQuiz = quiz.map((q: any) => ({
    question: q.question || q.prompt || '',
    choices: q.options || q.choices || [],
    answerIndex: q.answerIndex ?? 0,
  }))

  return (
    <div className="mb-3">
      <QuizRunner
        quiz={convertedQuiz}
        onRestart={onFinish}
      />
    </div>
  )
}
