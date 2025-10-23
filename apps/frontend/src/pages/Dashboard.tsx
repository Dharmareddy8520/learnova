import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../components/AppSidebar";

import { Calendar, BookOpen, Zap, Brain } from "lucide-react";

type DashboardData = {
  progressData?: {
    consecutiveDays?: number;
    documentsCount?: number;
    flashcardsStudied?: number;
    quizzesCompleted?: number;
    totalDays?: number;
  };
};

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: JSX.Element;
  label: string;
  value: number | string;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const tone: Record<string, string> = {
    blue: "text-blue-600",
    green: "text-green-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gray-50 p-2 ${tone[color]}`}>{icon}</div>
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-2xl font-semibold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // summarize
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [sumError, setSumError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/dashboard");
        setData(res.data);
      } catch {
        setData(null); // soft-fail: still show the page
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const consecutiveDays = data?.progressData?.consecutiveDays ?? 0;
  const documents = data?.progressData?.documentsCount ?? 0;
  const flashcards = data?.progressData?.flashcardsStudied ?? 0;
  const quizzes = data?.progressData?.quizzesCompleted ?? 0;

  // (optional) if you want to display % streak, compute via totalDays
  const progressPct = useMemo(() => {
    const total = Math.max(1, data?.progressData?.totalDays ?? 1);
    const done = Math.min(total, consecutiveDays);
    return Math.round((done / total) * 100);
  }, [data, consecutiveDays]);

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSummarizing(true);
    setSummary("");
    setSumError(null);
    try {
      const MAX_LEN = 10000;
      const payload = { text: text.length > MAX_LEN ? text.slice(0, MAX_LEN) : text };
      const { data } = await axios.post(
        "/api/summarize",
        payload,
        { headers: { "Content-Type": "application/json" }, timeout: 30000 }
      );
      if (data?.summary) setSummary(data.summary);
      else throw new Error(data?.error || "No summary returned");
    } catch (err: any) {
      setSumError(err?.response?.data?.error || err?.message || "Summarization failed.");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* LEFT RAIL */}
      <Sidebar />

      {/* MAIN */}
      <main className="ml-64 p-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, <span className="text-gray-900"></span>!
          </h1>
          <p className="mt-1 text-gray-600">Ready to continue your learning journey?</p>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            label="Consecutive Days"
            value={consecutiveDays}
            color="blue"
          />
          <StatCard
            icon={<BookOpen className="h-6 w-6" />}
            label="Documents"
            value={documents}
            color="green"
          />
          <StatCard
            icon={<Zap className="h-6 w-6" />}
            label="Flashcards"
            value={flashcards}
            color="yellow"
          />
          <StatCard
            icon={<Brain className="h-6 w-6" />}
            label="Quizzes"
            value={quizzes}
            color="purple"
          />
        </section>

        {/* Quick Paste & Summary */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-900">Quick Paste & Summarize</h2>
            <form onSubmit={handleSummarize} className="mt-4 space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste any text here to get an instant AI summary…"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                disabled={!text.trim() || summarizing}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {summarizing ? "Summarizing…" : "Get Summary"}
              </button>
              {sumError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {sumError}
                </div>
              )}
            </form>
          </div>

          {/* Right: Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-800 min-h-[220px]">
              {summary ? (
                <p className="whitespace-pre-wrap leading-relaxed">{summary}</p>
              ) : loading ? (
                <p className="text-gray-500">Loading…</p>
              ) : (
                <p className="text-gray-500">
                  Your summary will appear here after you paste text and click <b>Get Summary</b>.
                </p>
              )}
            </div>

            {/* optional small streak bar to match the vibe */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Streak Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
