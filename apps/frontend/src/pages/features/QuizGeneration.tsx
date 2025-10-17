import React, { useState } from 'react';
import axios from 'axios';

const QuizGeneration = () => {
  const [text, setText] = useState('');
  const [quiz, setQuiz] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateQuiz = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/ml/quiz', { text, count: 5 });
      const parsedQuiz = Array.isArray(response.data.quiz) ? response.data.quiz : [];
      setQuiz(parsedQuiz);
    } catch (error) {
      console.error('Error generating quiz:', error);
      setQuiz([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Quiz Generation</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to generate a quiz..."
        className="w-full p-2 border rounded mb-4"
        rows={6}
      />
      <button
        onClick={handleGenerateQuiz}
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
      </button>
      {quiz.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Quiz</h2>
          <ul className="list-disc pl-5">
            {quiz.map((q, index) => (
              <li key={index}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QuizGeneration;