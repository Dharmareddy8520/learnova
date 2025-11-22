import React, { useState, useCallback } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, RotateCcw, Play, ChevronRight, ChevronLeft, Eye } from 'lucide-react';

// Types for interactive components
type Question = {
  question: string;
  options?: string[];
  answer: string;
  correct?: number;
};

// Flashcards are now simple important-point strings (no Q/A pairs)
type Flashcard = string;

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

const FileUploadSummary: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<{
    summarize: boolean;
    quiz: boolean;
    flashcards: boolean;
  }>({ summarize: true, quiz: false, flashcards: false });
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
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData);
      const uploadId = uploadData.uploadId;
      const fileName = uploadData.meta?.filename || 'Document';
      
      // Store the uploaded filename
      console.log('Setting fileName state to:', fileName);
      setUploadedFileName(fileName);
      console.log(`✅ File uploaded: ${fileName}`);

      // Start analysis
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          tasks: getTransformedTasks(),
        }),
        credentials: 'include',
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
      transformedTasks.quiz = (Number.isFinite(n) && n > 0 && n <= 50) ? { numQuestions: n } : { numQuestions: 8 };
    }
    if (selectedTasks.flashcards) {
      const m = Number(flashcardCount);
      transformedTasks.flashcards = (Number.isFinite(m) && m > 0 && m <= 100) ? { count: m } : { count: 12 };
    }
    return transformedTasks;
  };

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/analyze/${id}/status`, {
        credentials: 'include',
      });
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="relative text-center animate-slideInDown">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Multi-Task AI Document Analyzer</h2>
        <p className="text-gray-600">Upload a document and choose which AI tasks to perform</p>
      </div>

      {/* Input Mode Toggle */}
      <div className="flex justify-center gap-4 mb-4 animate-slideInUp" style={{animationDelay: '0.1s'}}>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg font-medium border transition-all ${inputMode === 'file' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-700 shadow-lg' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50 hover-lift'}`}
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
          className={`px-4 py-2 rounded-lg font-medium border transition-all ${inputMode === 'text' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-700 shadow-lg' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50 hover-lift'}`}
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
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />
        </>
      ) : (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 animate-scaleIn hover:border-blue-500 transition-colors">
          <textarea
            className="w-full min-h-[120px] rounded-lg border border-blue-200 p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:shadow-md"
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
            min={0}
            max={50}
            value={quizCount}
            onChange={(e) => setQuizCount(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-md"
          />
          <p className="text-sm text-gray-500">Number of multiple-choice questions (0–50).</p>
        </div>
      )}

      {selectedTasks.flashcards && (
        <div className="mt-2 flex items-center gap-3">
          <label className="text-sm text-gray-700">Flashcards:</label>
          <input
            type="number"
            min={0}
            max={100}
            value={flashcardCount}
            onChange={(e) => setFlashcardCount(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-md"
          />
          <p className="text-sm text-gray-500">Number of flashcards to generate (0–100).</p>
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

      {/* Uploaded Filename Display */}
      {uploadedFileName && !jobStatus && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-900">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">📄 {uploadedFileName}</span>
          </div>
        </div>
      )}

      {/* Interactive Loading UI - Show Results As They Complete */}
      {jobStatus && jobStatus.status === 'running' && (
        <div className="space-y-6">
          {/* Status Header */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-4">
              <div className="animate-spin">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-blue-900">Processing Your Document</h2>
                <p className="text-sm text-blue-800">
                  {uploadedFileName && (
                    <>
                      📄 {uploadedFileName} • 
                    </>
                  )}
                  Generating summary, quiz, and flashcards...
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-2xl">{jobStatus.results?.summary ? '✅' : '⏳'}</span>
                  <span className="text-xs text-gray-700 font-medium mt-1">Summary</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl">{jobStatus.results?.quiz ? '✅' : '⏳'}</span>
                  <span className="text-xs text-gray-700 font-medium mt-1">Quiz</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl">{jobStatus.results?.flashcards ? '✅' : '⏳'}</span>
                  <span className="text-xs text-gray-700 font-medium mt-1">Flashcards</span>
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full animate-pulse rounded-full"
                style={{ width: '100%' }}
              ></div>
            </div>
            <p className="text-xs text-center text-blue-700 mt-2">This usually takes 10-30 seconds...</p>
          </div>

          {/* Summary Results - Show immediately when available */}
          {jobStatus.results?.summary && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Summary</span>
              </h3>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-gray-800 leading-relaxed">{jobStatus.results.summary}</p>
              </div>
            </div>
          )}

          {/* Quiz - Interactive Mode During Loading */}
          {jobStatus.results?.quiz && (() => {
            const questions = normalizeQuiz(jobStatus.results.quiz);
            
            if (interactiveMode.quiz.active && interactiveMode.quiz.questions.length > 0) {
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Play className="h-5 w-5 text-purple-600" />
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
            
            return questions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <span>Quiz Ready ({questions.length} questions)</span>
                  </h3>
                  <span className="text-xs text-gray-600">Still processing remaining tasks...</span>
                </div>
                <button
                  onClick={startInteractiveQuiz}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Start Quiz Now While Processing
                </button>
              </div>
            ) : null;
          })()}

          {/* Flashcards - Interactive Mode During Loading */}
          {jobStatus.results?.flashcards && (() => {
            const cards = normalizeFlashcards(jobStatus.results.flashcards);
            
            if (interactiveMode.flashcards.active && interactiveMode.flashcards.cards.length > 0) {
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Play className="h-5 w-5 text-orange-600" />
                      <span>Study Flashcards</span>
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
            
            return cards.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-orange-600" />
                    <span>Flashcards Ready ({cards.length} cards)</span>
                  </h3>
                  <span className="text-xs text-gray-600">Still processing remaining tasks...</span>
                </div>
                <button
                  onClick={startInteractiveFlashcards}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
                >
                  Study Flashcards Now While Processing
                </button>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Results Display */}
      {jobStatus && jobStatus.status === 'done' && jobStatus.results && (
        <div className="space-y-6">
          {/* Compact Status Indicators */}
          <div className="flex justify-center gap-3 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-1">
              <span className="text-sm">{jobStatus.results?.summary ? '✅' : '⏳'}</span>
              <span className="text-xs text-gray-600">Summary</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1">
              <span className="text-sm">{jobStatus.results?.quiz ? '✅' : '⏳'}</span>
              <span className="text-xs text-gray-600">Quiz</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1">
              <span className="text-sm">{jobStatus.results?.flashcards ? '✅' : '⏳'}</span>
              <span className="text-xs text-gray-600">Flashcards</span>
            </div>
          </div>
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

              {/* Q&A moved to floating chat - no longer showing here */}
        </div>
      )}

      {/* Failed Status Display */}
      {jobStatus && jobStatus.status === 'failed' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-red-800 mb-2">Analysis Failed</h3>
          {jobStatus.errors && (
            <pre className="text-red-700 text-sm whitespace-pre-wrap">
              {JSON.stringify(jobStatus.errors, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Debug: raw job status (helpful when summary missing) */}
      {jobStatus && jobStatus.status === 'done' && !jobStatus.results?.summary && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600">Show raw job status (debug)</summary>
          <pre className="text-xs mt-2 p-2 bg-gray-50 border rounded">{JSON.stringify(jobStatus, null, 2)}</pre>
        </details>
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