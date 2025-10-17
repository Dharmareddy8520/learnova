import React, { useState } from 'react';
import axios from 'axios';

const Summarization = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/ml/summarize', { text });
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error summarizing text:', error);
      setSummary('Failed to generate summary.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Summarization</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to summarize..."
        className="w-full p-2 border rounded mb-4"
        rows={6}
      />
      <button
        onClick={handleSummarize}
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? 'Summarizing...' : 'Summarize'}
      </button>
      {summary && (
        <div className="mt-4 p-4 border rounded bg-gray-100">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
};

export default Summarization;