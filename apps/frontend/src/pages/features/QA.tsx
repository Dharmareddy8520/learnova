import React, { useState } from 'react';
import axios from 'axios';

const QA = () => {
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAskQuestion = async () => {
    if (!text.trim() || !question.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/ml/qa', { text, question });
      setAnswer(response.data.answer);
    } catch (error) {
      console.error('Error answering question:', error);
      setAnswer('Failed to get an answer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Q&A Assistance</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text for context..."
        className="w-full p-2 border rounded mb-4"
        rows={6}
      />
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter your question..."
        className="w-full p-2 border rounded mb-4"
      />
      <button
        onClick={handleAskQuestion}
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? 'Getting Answer...' : 'Ask Question'}
      </button>
      {answer && (
        <div className="mt-4 p-4 border rounded bg-gray-100">
          <h2 className="text-xl font-semibold mb-2">Answer</h2>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
};

export default QA;