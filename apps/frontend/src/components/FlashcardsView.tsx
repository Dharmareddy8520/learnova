import React, { useState } from 'react'

// Accept several card shapes: { question, answer }, { front, back }, or simple string
type RawCard = any

const FlashcardsView: React.FC<{ cards: RawCard[] }> = ({ cards }) => {
  const [idx, setIdx] = useState(0)
  const [showBack, setShowBack] = useState(false)

  if (!cards || cards.length === 0) return <div>No flashcards</div>

  const cur = cards[idx]

  // normalize a card to { front, back }
  function normalize(card: RawCard) {
    if (!card) return { front: '', back: '' }
    if (typeof card === 'string') return { front: card, back: '' }
    if (typeof card === 'object') {
      // common keys mapping
      const front = (card.question ?? card.front ?? card.q ?? card.prompt ?? card.text ?? '')
      const back = (card.answer ?? card.back ?? card.a ?? card.answer_text ?? card.explanation ?? '')
      return { front: String(front || '').trim(), back: String(back || '').trim() }
    }
    return { front: String(card), back: '' }
  }

  const { front, back } = normalize(cur)

  return (
    <div>
      <div className="p-6 border rounded shadow text-center bg-white">
        <div className="text-lg font-semibold mb-3">{idx + 1} / {cards.length}</div>
        <div className="min-h-[6rem]">
          {!showBack ? (
            <div className="text-left">{front || <span className="text-gray-400">(no front text)</span>}</div>
          ) : (
            <div className="text-left text-gray-700">{back || <span className="text-gray-400">(no answer provided)</span>}</div>
          )}
        </div>
        <div className="mt-4 flex gap-3 justify-center">
          <button className="btn" onClick={() => setShowBack(s => !s)}>{showBack ? 'Hide' : 'Show Answer'}</button>
          <button className="btn" onClick={() => { setIdx(i => Math.max(0, i - 1)); setShowBack(false) }}>Prev</button>
          <button className="btn" onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setShowBack(false) }}>Next</button>
        </div>
      </div>
    </div>
  )
}

export default FlashcardsView
