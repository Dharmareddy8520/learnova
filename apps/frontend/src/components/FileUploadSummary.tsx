import React, { useState, useCallback } from 'react';
import { Upload, FileText, Clock, CheckCircle, AlertCircle, RotateCcw, Play, ChevronRight, ChevronLeft, Eye, EyeOff, MessageSquare, Copy, Check } from 'lucide-react';

// Types for interactive components
type Question = {
  question: string;
  options?: string[];
  answer: string;
  correct?: number;
};

type Flashcard = {
  front: string;
  back: string;
};

type QAItem = {
  question: string;
  answer: string;
  score?: number | null;
  start?: number | null;
  end?: number | null;
};

interface JobStatus {
  status: 'queued' | 'running' | 'done' | 'failed';
  results?: { 
    summary?: string;
    quiz?: any;
    qa?: any;
    flashcards?: any;
  };
  errors?: any;
}

// Normalization functions from the reference files
function normalizeQuiz(raw: any): Question[] {
  if (Array.isArray(raw)) {
    return raw.map((q: any, i: number) => ({
      question: q.question || q.q || `Question ${i + 1}`,
      options: q.options || q.choices || [],
      answer: q.answer || '',
      correct: typeof q.correct === 'number' ? q.correct : 
               typeof q.answerIndex === 'number' ? q.answerIndex : 0,
    })).filter(q => q.question && q.options.length >= 2);
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return normalizeQuiz(parsed);
    } catch {
      // Try to parse simple MCQ text "Q:, A) ... Answer: C"
      const blocks = raw
        .split(/\n(?=Q:|\d+\.)/i)
        .map((s) => s.trim())
        .filter(Boolean);

      const out: Question[] = [];
      for (const b of blocks) {
        const qMatch = b.match(/Q:\s*(.+)/i) || b.match(/^\d+\.\s*(.+)/);
        if (!qMatch) continue;
        const question = qMatch[1].trim();
        const options = Array.from(b.matchAll(/^[A-D]\)\s*(.+)$/gim)).map((m) =>
          m[1].trim()
        );
        const ansMatch = b.match(/Answer:\s*([A-D])/i);
        let correct = 0;
        if (ansMatch) {
          const letter = ansMatch[1].toUpperCase();
          correct = Math.max(0, 'ABCD'.indexOf(letter));
        }
        if (question && options.length >= 2) {
          out.push({ question, options, answer: options[correct] || '', correct });
        }
      }
      return out;
    }
  }

  return [];
}

function normalizeFlashcards(raw: any): Flashcard[] {
  if (Array.isArray(raw)) {
    return raw
      .map((c: any) => ({
        front: c.front ?? c.question ?? '',
        back: c.back ?? c.answer ?? '',
      }))
      .filter((c: Flashcard) => c.front || c.back);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return normalizeFlashcards(parsed);
    } catch {
      const blocks = raw
        .split(/\n(?=Flashcard\s+\d+:)/i)
        .map((s) => s.trim())
        .filter(Boolean);

      const cards: Flashcard[] = [];
      for (const b of blocks) {
        const front = b.match(/Front:\s*(.+)/i)?.[1]?.trim() || '';
        const back = b.match(/Back:\s*(.+)/i)?.[1]?.trim() || '';
        if (front || back) cards.push({ front, back });
      }
      return cards.length ? cards : [{ front: raw, back: '' }];
    }
  }
  return [];
}

// Interactive Quiz Player Component (based on QuizGenerator.tsx)
const QuizPlayer: React.FC<{ questions: Question[], onRestart: () => void }> = ({ questions, onRestart }) => {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);

  const q = questions[idx];
  const finished = idx >= questions.length;
  const progress = Math.round((idx / questions.length) * 100);

  const handleSubmit = () => {
    if (selected == null || locked) return;
    setLocked(true);
    if (selected === q.correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (!locked) return;
    const n = idx + 1;
    if (n < questions.length) {
      setIdx(n);
      setSelected(null);
      setLocked(false);
    } else {
      setIdx(questions.length);
    }
  };

  const restart = () => {
    setIdx(0);
    setSelected(null);
    setLocked(false);
    setScore(0);
    onRestart();
  };

  if (finished) {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="mt-6 rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Quiz Results</h2>
        <p className="text-gray-700 mb-4">
          Score: <span className="font-semibold">{score}</span> / {total} ({pct}%)
        </p>
        <div className="mb-6 h-3 w-full rounded bg-gray-200 overflow-hidden">
          <div className="h-3 bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <button onClick={restart} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          <RotateCcw className="h-4 w-4" />
          Restart Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Question {idx + 1} of {questions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
          <div className="h-2 bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">{q.question}</h2>

        <div className="grid gap-3">
          {q.options?.map((c, i) => {
            const isSelected = selected === i;
            const showCorrect = locked && i === q.correct;
            const showWrong = locked && isSelected && i !== q.correct;

            const base = 'w-full text-left rounded-lg px-4 py-3 ring-1 transition focus:outline-none focus:ring-2';
            const neutral = 'ring-gray-300 hover:bg-gray-50';
            const sel = 'ring-indigo-400 bg-indigo-50';
            const correct = 'ring-green-400 bg-green-50';
            const wrong = 'ring-red-400 bg-red-50';

            const stateClass = locked
              ? showCorrect
                ? correct
                : showWrong
                ? wrong
                : neutral
              : isSelected
              ? sel
              : neutral;

            return (
              <button
                key={i}
                className={`${base} ${stateClass}`}
                onClick={() => !locked && setSelected(i)}
                disabled={locked}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                {c}
                {showCorrect && <span className="ml-2 text-green-600">✓</span>}
                {showWrong && <span className="ml-2 text-red-600">✗</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          {!locked ? (
            <button
              onClick={handleSubmit}
              disabled={selected == null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Play className="h-4 w-4" />
              Submit
            </button>
          ) : (
            <button onClick={next} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <span className="ml-auto text-sm text-gray-600">
            Score: <span className="font-semibold">{score}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// Interactive Flashcard Viewer Component (based on FlashcardsPage.tsx)
const FlashcardViewer: React.FC<{ cards: Flashcard[] }> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    setIsFlipped(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setIsFlipped(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Flashcard {currentIndex + 1} of {cards.length}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {isFlipped ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isFlipped ? 'Hide Answer' : 'Show Answer'}
          </button>
        </div>
      </div>

      <div className="relative">
        <div 
          className="h-48 bg-white rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="h-full p-6 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isFlipped ? 'Answer:' : 'Question:'}
              </p>
              <p className="text-gray-700">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={handlePrev}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        
        <span className="text-sm text-gray-600">
          Click card to flip
        </span>
        
        <button
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Interactive Q&A Component (based on QAPage.tsx)
const QASection: React.FC<{ hasContent: boolean }> = ({ hasContent }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!question.trim()) {
      setError('Please provide a question.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await response.json();
      
      const item: QAItem = {
        question,
        answer: data?.answer ?? '',
        score: data?.score ?? null,
        start: data?.start ?? null,
        end: data?.end ?? null,
      };
      setHistory((h) => [item, ...h].slice(0, 12));
      setQuestion('');
    } catch (err: any) {
      setError(err?.message || 'Q/A failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {}
  };

  if (!hasContent) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900 flex items-center space-x-2">
        <MessageSquare className="h-5 w-5 text-orange-600" />
        <span>Ask Questions</span>
      </h3>
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
        <p className="text-gray-800">
          Document analyzed and ready for questions. Ask anything about the content:
        </p>
        
        <form onSubmit={ask} className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the document..."
              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Asking...' : 'Ask'}
            </button>
          </div>
          
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 text-sm">
              {error}
            </div>
          )}
        </form>
        
        {history.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="space-y-1">
                <div className="bg-indigo-100 text-indigo-900 px-3 py-2 rounded-lg">
                  <strong>Q:</strong> {h.question}
                </div>
                <div className="bg-white text-gray-900 px-3 py-2 rounded-lg border">
                  <div className="mb-2">
                    <strong>A:</strong> {h.answer}
                  </div>
                  <div className="flex items-center gap-2">
                    {h.score == null ? (
                      <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Generated</div>
                    ) : (
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Extracted • {(Number(h.score) * 100).toFixed(1)}%
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => copyText(h.answer)} 
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs ring-1 ring-gray-300 hover:bg-gray-50"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} 
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FileUploadSummary: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<{
    summarize: boolean;
    quiz: boolean;
    qa: boolean;
    flashcards: boolean;
  }>({ summarize: true, quiz: false, qa: false, flashcards: false });
  
  // Interactive mode states
  const [interactiveMode, setInteractiveMode] = useState<{
    quiz: { active: boolean; questions: Question[] };
    flashcards: { active: boolean; cards: Flashcard[] };
  }>({
    quiz: { active: false, questions: [] },
    flashcards: { active: false, cards: [] }
  });

  const startInteractiveQuiz = () => {
    if (!jobStatus?.results?.quiz) return;
    const questions = normalizeQuiz(jobStatus.results.quiz);
    if (questions.length > 0) {
      setInteractiveMode(prev => ({
        ...prev,
        quiz: { active: true, questions }
      }));
    }
  };

  const startInteractiveFlashcards = () => {
    if (!jobStatus?.results?.flashcards) return;
    const cards = normalizeFlashcards(jobStatus.results.flashcards);
    if (cards.length > 0) {
      setInteractiveMode(prev => ({
        ...prev,
        flashcards: { active: true, cards }
      }));
    }
  };

  const resetInteractiveMode = () => {
    setInteractiveMode({
      quiz: { active: false, questions: [] },
      flashcards: { active: false, cards: [] }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setJobStatus(null);
      setError(null);
      resetInteractiveMode();
    }
  };

  const handleTaskChange = (task: keyof typeof selectedTasks) => {
    setSelectedTasks(prev => ({ ...prev, [task]: !prev[task] }));
  };

  const uploadAndAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    resetInteractiveMode();

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        // Try to read JSON error body for better UX
        let errBody: any = null;
        try { errBody = await uploadResponse.json(); } catch (e) { /* ignore parse errors */ }
        const msg = errBody?.error || errBody?.message || uploadResponse.statusText;
        throw new Error(`Upload failed: ${msg}`);
      }

      const uploadData = await uploadResponse.json();
      const uploadId = uploadData.uploadId;

      // Transform selectedTasks to backend format
      const transformedTasks: any = {};
      if (selectedTasks.summarize) {
        transformedTasks.summarize = true;
      }
      if (selectedTasks.quiz) {
        transformedTasks.quiz = { numQuestions: 8 }; // Default to 8 questions
      }
      if (selectedTasks.qa) {
        transformedTasks.qa = true;
      }
      if (selectedTasks.flashcards) {
        transformedTasks.flashcards = { count: 12 }; // Default to 12 flashcards
      }

      // Start analysis
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          tasks: transformedTasks,
        }),
      });

      if (!analyzeResponse.ok) {
        let errBody: any = null;
        try { errBody = await analyzeResponse.json(); } catch (e) { }
        const msg = errBody?.error || errBody?.message || analyzeResponse.statusText;
        throw new Error(`Analysis failed: ${msg}`);
      }

      const analyzeData = await analyzeResponse.json();

      // Poll for status
      pollJobStatus(analyzeData.jobId);
    } catch (err: any) {
      setError(err.message || 'Upload and analysis failed');
    } finally {
      setIsUploading(false);
    }
  };

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/analyze/${id}/status`);
      if (!response.ok) {
        let errBody: any = null;
        try { errBody = await response.json(); } catch (e) { }
        const msg = errBody?.error || errBody?.message || response.statusText;
        throw new Error(`Status check failed: ${msg}`);
      }

      const data = await response.json();
      setJobStatus(data);

      if (data.status === 'running' || data.status === 'queued') {
        setTimeout(() => pollJobStatus(id), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Status check failed');
    }
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Multi-Task AI Document Analyzer</h2>
        <p className="text-gray-600">Upload a document and choose which AI tasks to perform</p>
      </div>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {file ? file.name : 'Choose a file to upload'}
          </p>
          <p className="text-gray-500">PDF, DOCX, TXT files supported</p>
        </div>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.docx,.txt"
          className="mt-4"
        />
      </div>

      {/* Task Selection */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Select Analysis Tasks</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(selectedTasks).map(([task, isSelected]) => (
            <label key={task} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleTaskChange(task as keyof typeof selectedTasks)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-900 capitalize">{task}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={uploadAndAnalyze}
        disabled={!file || isUploading || !Object.values(selectedTasks).some(Boolean)}
        className="w-full flex items-center justify-center space-x-2 py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FileText className="h-5 w-5" />
        <span>{isUploading ? 'Processing...' : 'Upload and Analyze'}</span>
      </button>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
        </div>
      )}

      {/* Status Display */}
      {jobStatus && (
        <div className="space-y-6">
          <div className={`p-4 border rounded-lg ${getStatusColor(jobStatus.status)}`}>
            <div className="flex items-center space-x-2">
              {getStatusIcon(jobStatus.status)}
              <span className="font-medium capitalize">{jobStatus.status}</span>
            </div>
          </div>

          {jobStatus.status === 'done' && jobStatus.results && (
            <div className="space-y-6">
              {/* Summary Results */}
              {jobStatus.results.summary && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Summary</span>
                  </h3>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-gray-800 leading-relaxed">{jobStatus.results.summary}</p>
                  </div>
                </div>
              )}
              
              {/* Summary Error */}
              {!jobStatus.results.summary && jobStatus.errors?.summary && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span>Summary Failed</span>
                  </h3>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-2">Error generating summary:</p>
                    <p className="text-red-700">{jobStatus.errors.summary}</p>
                  </div>
                </div>
              )}

              {/* Quiz Results - Interactive Mode */}
              {jobStatus.results.quiz && (() => {
                const questions = normalizeQuiz(jobStatus.results.quiz);
                
                // If interactive mode is active, show the quiz player
                if (interactiveMode.quiz.active && interactiveMode.quiz.questions.length > 0) {
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-purple-600" />
                          <span>Interactive Quiz</span>
                        </h3>
                        <button
                          onClick={resetInteractiveMode}
                          className="text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                          Exit Quiz
                        </button>
                      </div>
                      <QuizPlayer 
                        questions={interactiveMode.quiz.questions} 
                        onRestart={resetInteractiveMode}
                      />
                    </div>
                  );
                }
                
                // Show quiz preview with start button
                return questions.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                      <span>Quiz Questions ({questions.length})</span>
                    </h3>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-gray-800 mb-3">
                        Quiz generated with {questions.length} questions. Ready to start the interactive quiz?
                      </p>
                      <button
                        onClick={startInteractiveQuiz}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                      >
                        <Play className="h-4 w-4" />
                        Start Interactive Quiz
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                      <span>Quiz</span>
                    </h3>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-gray-600">No quiz questions were generated from the content.</p>
                    </div>
                  </div>
                );
              })()}
              
              {/* Quiz Error */}
              {!jobStatus.results.quiz && jobStatus.errors?.quiz && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span>Quiz Generation Failed</span>
                  </h3>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-2">Error generating quiz:</p>
                    <p className="text-red-700">{jobStatus.errors.quiz}</p>
                  </div>
                </div>
              )}

              {/* Flashcards Results - Interactive Mode */}
              {jobStatus.results.flashcards && (() => {
                const cards = normalizeFlashcards(jobStatus.results.flashcards);
                
                // If interactive mode is active, show the flashcard viewer
                if (interactiveMode.flashcards.active && interactiveMode.flashcards.cards.length > 0) {
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-indigo-600" />
                          <span>Interactive Flashcards</span>
                        </h3>
                        <button
                          onClick={resetInteractiveMode}
                          className="text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                          Exit Flashcards
                        </button>
                      </div>
                      <FlashcardViewer cards={interactiveMode.flashcards.cards} />
                    </div>
                  );
                }
                
                // Show flashcards preview with start button
                return cards.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                      <span>Flashcards ({cards.length})</span>
                    </h3>
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-gray-800 mb-3">
                        Flashcards generated with {cards.length} cards. Ready to start studying?
                      </p>
                      <button
                        onClick={startInteractiveFlashcards}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        <Eye className="h-4 w-4" />
                        Start Flashcard Study
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                      <span>Flashcards</span>
                    </h3>
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-gray-600">No flashcards were generated from the content.</p>
                    </div>
                  </div>
                );
              })()}
              
              {/* Flashcards Error */}
              {!jobStatus.results.flashcards && jobStatus.errors?.flashcards && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span>Flashcards Generation Failed</span>
                  </h3>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-2">Error generating flashcards:</p>
                    <p className="text-red-700">{jobStatus.errors.flashcards}</p>
                  </div>
                </div>
              )}

              {/* Q&A Section - Only show if Q&A was requested */}
              {jobStatus.results.qa && (
                <QASection hasContent={Boolean(jobStatus.results.summary || jobStatus.results.quiz || jobStatus.results.flashcards)} />
              )}
              
              {/* Q&A Error */}
              {!jobStatus.results.qa && jobStatus.errors?.qa && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span>Q&A Failed</span>
                  </h3>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-2">Error in Q&A processing:</p>
                    <p className="text-red-700">{jobStatus.errors.qa}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {jobStatus.status === 'failed' && jobStatus.errors && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Analysis Failed</h3>
              <pre className="text-red-700 text-sm whitespace-pre-wrap">
                {JSON.stringify(jobStatus.errors, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Process Another File Button */}
      {jobStatus?.status === 'done' && (
        <div className="text-center">
          <button
            onClick={() => {
              setFile(null);
              setJobStatus(null);
              setError(null);
              resetInteractiveMode();
            }}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
            <span>Process Another File</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploadSummary;