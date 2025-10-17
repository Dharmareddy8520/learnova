import React, { useState } from 'react';
import axios from 'axios';

const Flashcards = () => {
  const [text, setText] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateFlashcards = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/ml/flashcards', { text, count: 5 });
      const parsedFlashcards = Array.isArray(response.data.flashcards) ? response.data.flashcards : [];
      setFlashcards(parsedFlashcards);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Flashcard Creation</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to generate flashcards..."
        className="w-full p-2 border rounded mb-4"
        rows={6}
      />
      <button
        onClick={handleGenerateFlashcards}
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? 'Generating Flashcards...' : 'Generate Flashcards'}
      </button>
      {flashcards.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Flashcards</h2>
          <ul className="list-disc pl-5">
            {flashcards.map((card, index) => (
              <li key={index}>{card}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Flashcards;