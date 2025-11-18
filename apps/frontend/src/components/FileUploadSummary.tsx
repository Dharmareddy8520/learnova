import React, { useState, useCallback } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, RotateCcw, Play, ChevronRight, ChevronLeft, Eye, MessageSquare, Copy, Check } from 'lucide-react';

// Types for interactive components
type Question = {
  question: string;
  options?: string[];
  answer: string;
  correct?: number;
};

// Flashcards are now simple important-point strings (no Q/A pairs)
type Flashcard = string;

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
  // Desired final shape: string[] where each entry is an important point.
  if (Array.isArray(raw)) {
    // If array of strings, return as-is (filter empties).
    if (raw.every((r) => typeof r === 'string')) {
      return raw.map((r) => (r || '').trim()).filter(Boolean);
    }

    // If array of objects (old shape), prefer front, then question, then answer.
    return raw
      .map((c: any) => String(c.front ?? c.question ?? c.back ?? c.answer ?? '').trim())
      .filter(Boolean);
  }

  if (typeof raw === 'string') {
    // Try JSON first
    try {
      const parsed = JSON.parse(raw);
      return normalizeFlashcards(parsed);
    } catch {
      // Heuristic: split by numbered / bullet blocks or Front:/Back: markers
      const byNumber = raw
        .split(/\n(?=\d+\.|Flashcard\s+\d+:|\-\s|\*\s)/i)
        .map((s) => s.trim())
        .filter(Boolean);

      if (byNumber.length > 1) {
        return byNumber.map((b) => {
          const front = b.match(/Front:\s*(.+)/i)?.[1]?.trim();
          if (front) return front;
          const back = b.match(/Back:\s*(.+)/i)?.[1]?.trim();
          if (back) return back;
          // Fallback to first line
          return b.split('\n')[0].trim();
        }).filter(Boolean);
      }

      // Last resort: return the whole text as one point
      const collapsed = raw.trim();
      return collapsed ? [collapsed] : [];
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
// Simple study viewer for point-only flashcards (no Q/A flipping)
const FlashcardViewer: React.FC<{ cards: Flashcard[] }> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!cards || cards.length === 0) return null;

  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Flashcard {currentIndex + 1} of {cards.length}
        </h3>
        <div className="text-sm text-gray-600">Study the key points below</div>
      </div>

      <div className="relative">
        <div className="h-48 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">Key Point</p>
            <p className="text-gray-700 leading-relaxed">{cards[currentIndex]}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button onClick={handlePrev} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition" disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="text-sm text-gray-600">Navigate through the key points</span>

        <button onClick={handleNext} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition" disabled={currentIndex === cards.length - 1}>
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Interactive Q&A Component (based on QAPage.tsx)
const QASection: React.FC<{ hasContent: boolean; context: string }> = ({ hasContent, context }) => {
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
      // send context + question so backend can run extractive QA over the document
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: context || '', question })
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
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<{
    summarize: boolean;
    quiz: boolean;
    qa: boolean;
    flashcards: boolean;
  }>({ summarize: true, quiz: false, qa: false, flashcards: false });
  const [desiredWords, setDesiredWords] = useState<string>('200');
  const [quizCount, setQuizCount] = useState<string>('8');
  const [flashcardCount, setFlashcardCount] = useState<string>('12');
  
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
    if (inputMode === 'text' && pastedText.trim()) {
      setIsUploading(true);
      setError(null);
      resetInteractiveMode();
      try {
        // Directly send pasted text to backend (simulate upload)
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pastedText,
            tasks: getTransformedTasks(),
          }),
        });
        if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);
        const data = await response.json();
        pollJobStatus(data.jobId);
      } catch (err: any) {
        setError(err.message || 'Analysis failed');
      } finally {
        setIsUploading(false);
      }
      return;
    }
    if (inputMode === 'file' && !file) return;

    setIsUploading(true);
    setError(null);
    resetInteractiveMode();

    try {
      // Upload file
      const formData = new FormData();
      if (file) formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      const uploadId = uploadData.uploadId;

      // Start analysis
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          tasks: getTransformedTasks(),
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error(`Analysis failed: ${analyzeResponse.statusText}`);
      }

      const analyzeData = await analyzeResponse.json();
      pollJobStatus(analyzeData.jobId);
    } catch (err: any) {
      setError(err.message || 'Upload and analysis failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to build tasks object
  const getTransformedTasks = () => {
    const transformedTasks: any = {};
    if (selectedTasks.summarize) {
      const w = Number(desiredWords);
      transformedTasks.summarize = (Number.isFinite(w) && w > 0) ? { desiredWords: w } : true;
    }
    if (selectedTasks.quiz) {
      const n = Number(quizCount);
      transformedTasks.quiz = (Number.isFinite(n) && n > 0 && n <= 25) ? { numQuestions: n } : { numQuestions: 8 };
    }
    if (selectedTasks.qa) {
      transformedTasks.qa = true;
    }
    if (selectedTasks.flashcards) {
      const m = Number(flashcardCount);
      transformedTasks.flashcards = (Number.isFinite(m) && m > 0 && m <= 50) ? { count: m } : { count: 12 };
    }
    return transformedTasks;
  };

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/analyze/${id}/status`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
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

      {/* Input Mode Toggle */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          type="button"
          className={`px-4 py-2 rounded-lg font-medium border transition-colors ${inputMode === 'file' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
          onClick={() => {
            setInputMode('file');
            setTimeout(() => {
              document.getElementById('hidden-file-input')?.click();
            }, 0);
          }}
        >
          Upload File
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg font-medium border transition-colors ${inputMode === 'text' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
          onClick={() => setInputMode('text')}
        >
          Paste Text
        </button>
      </div>

      {/* Upload or Paste Section */}
      {inputMode === 'file' ? (
        <>
          <input
            id="hidden-file-input"
            type="file"
            onChange={e => {
              handleFileChange(e);
              if (e.target.files?.[0]) {
                setTimeout(() => uploadAndAnalyze(), 0);
              }
            }}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />
        </>
      ) : (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
          <textarea
            className="w-full min-h-[120px] rounded-lg border border-blue-200 p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Paste or type your document text here..."
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            disabled={isUploading}
          />
        </div>
      )}

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

      {/* Summarization options */}
      {selectedTasks.summarize && (
        <div className="mt-2 flex items-center gap-3">
          <label className="text-sm text-gray-700">Summary length (words):</label>
          <input
            type="number"
            min={20}
            max={5000}
            value={desiredWords}
            onChange={(e) => setDesiredWords(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-md"
          />
          <p className="text-sm text-gray-500">Approximate word target for the summary.</p>
        </div>
      )}

      {/* Quiz / Flashcards count inputs */}
      {selectedTasks.quiz && (
        <div className="mt-2 flex items-center gap-3">
          <label className="text-sm text-gray-700">Quiz questions:</label>
          <input
            type="number"
            min={1}
            max={25}
            value={quizCount}
            onChange={(e) => setQuizCount(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-md"
          />
          <p className="text-sm text-gray-500">Number of multiple-choice questions (1–25).</p>
        </div>
      )}

      {selectedTasks.flashcards && (
        <div className="mt-2 flex items-center gap-3">
          <label className="text-sm text-gray-700">Flashcards:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={flashcardCount}
            onChange={(e) => setFlashcardCount(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-md"
          />
          <p className="text-sm text-gray-500">Number of flashcards to generate (1–50).</p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={uploadAndAnalyze}
        disabled={
          (inputMode === 'file' && !file) ||
          (inputMode === 'text' && !pastedText.trim()) ||
          isUploading ||
          !Object.values(selectedTasks).some(Boolean)
        }
        className="w-full flex items-center justify-center space-x-2 py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FileText className="h-5 w-5" />
        <span>{isUploading ? (inputMode === 'text' ? 'Analyzing...' : 'Processing...') : (inputMode === 'text' ? 'Analyze Text' : 'Upload and Analyze')}</span>
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
              {/* If job finished but no summary, show any summary-specific errors for debugging */}
              {!jobStatus.results?.summary && jobStatus.errors?.summary && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-800">Summary completed with issues</h3>
                  <pre className="text-sm text-yellow-700 whitespace-pre-wrap">{String(jobStatus.errors.summary)}</pre>
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

              {/* Q&A Section - Only show if Q&A was requested */}
              {jobStatus.results.qa && (() => {
                // Build a reasonable context for QA: prefer summary, otherwise join flashcards or quiz text
                const ctx = jobStatus.results.summary
                  || (Array.isArray(jobStatus.results.flashcards) ? jobStatus.results.flashcards.map((c: any) => {
                      if (typeof c === 'string') return c;
                      return String(c.front ?? c.question ?? c.back ?? c.answer ?? '').trim();
                    }).join('\n') : '')
                  || (Array.isArray(jobStatus.results.quiz) ? jobStatus.results.quiz.map((q: any) => q.question || '').join('\n') : '')
                  || '';
                return <QASection hasContent={Boolean(ctx)} context={ctx} />
              })()}
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
              {/* Debug: raw job status (helpful when summary missing) */}
              {!jobStatus.results?.summary && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600">Show raw job status (debug)</summary>
                  <pre className="text-xs mt-2 p-2 bg-gray-50 border rounded">{JSON.stringify(jobStatus, null, 2)}</pre>
                </details>
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

export { normalizeFlashcards };
export default FileUploadSummary;