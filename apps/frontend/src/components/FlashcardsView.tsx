import React, { useState } from 'react'

type Card = { question: string, answer: string }

const FlashcardsView: React.FC<{ cards: Card[] }> = ({ cards }) => {
  const [idx, setIdx] = useState(0)
  const [showBack, setShowBack] = useState(false)

  if (!cards || cards.length === 0) return <div>No flashcards</div>

  return (
    <div>
      <div className="p-6 border rounded shadow text-center bg-white">
        <div className="text-lg font-semibold mb-3">{idx+1} / {cards.length}</div>
        <div className="min-h-[6rem]">
          {!showBack ? (
            <div className="text-left">{cards[idx].question}</div>
          ) : (
            <div className="text-left text-gray-700">{cards[idx].answer}</div>
          )}
        </div>
        <div className="mt-4 flex gap-3 justify-center">
          <button className="btn" onClick={() => setShowBack(s => !s)}>{showBack ? 'Hide' : 'Show Answer'}</button>
          <button className="btn" onClick={() => { setIdx(i => Math.max(0, i-1)); setShowBack(false); }}>Prev</button>
          <button className="btn" onClick={() => { setIdx(i => Math.min(cards.length-1, i+1)); setShowBack(false); }}>Next</button>
        </div>
      </div>
    </div>
  )
}

export default FlashcardsView
