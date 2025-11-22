// src/pages/MyPerformance.tsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AppSidebar from "../components/AppSidebar";
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

const ui = {
  shell: "min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white",
  container: "max-w-6xl mx-auto px-6",
  card: "rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm transition p-6",
  stat: "rounded-2xl border border-gray-200 bg-white p-6",
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
    blue: "text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100",
    green: "text-green-600 bg-gradient-to-br from-green-50 to-green-100",
    yellow: "text-yellow-600 bg-gradient-to-br from-yellow-50 to-yellow-100",
    purple: "text-purple-600 bg-gradient-to-br from-purple-50 to-purple-100",
  };
  return (
    <div className={`${ui.stat} hover-lift`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gradient-to-br p-3 ${tone[color]} hover-scale`}>{icon}</div>
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-2xl font-semibold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function MyPerformance() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/dashboard");
        setData(res.data);
      } catch {
        setData(null);
      }
    })();
  }, []);

  // SEO meta for My Performance
  useEffect(() => {
    document.title = 'My Performance — Learnova'
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (desc) desc.content = 'Your Learnova Performance: learning streak, consecutive days, documents, flashcards, and quiz stats.'
  }, [])

  const consecutiveDays = data?.progressData?.consecutiveDays ?? 0;
  const documents = data?.progressData?.documentsCount ?? 0;
  const flashcards = data?.progressData?.flashcardsStudied ?? 0;
  const quizzes = data?.progressData?.quizzesCompleted ?? 0;

  const progressPct = useMemo(() => {
    const total = Math.max(1, data?.progressData?.totalDays ?? 1);
    const done = Math.min(total, consecutiveDays);
    return Math.round((done / total) * 100);
  }, [data, consecutiveDays]);

  return (
    <div className={ui.shell}>
      {/* Global Sidebar */}
      <AppSidebar />

      <main className={`pt-14 pb-14 md:pt-0 md:pb-0 md:pl-64`}>
        <div className={`${ui.container} py-8`}>
          {/* Header */}
          <header className="mb-8 animate-slideInDown">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
              My Performance
            </h1>
            <p className="mt-2 text-lg text-gray-600">Track your learning progress and achievements</p>
          </header>

          {/* Streak Progress Bar */}
          <div className={ui.card + " mb-8 animate-slideInUp"} style={{animationDelay: '0.1s'}}>
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span className="text-base font-semibold">Learning Streak</span>
                <span className="text-lg font-bold text-gradient">{consecutiveDays} days</span>
              </div>
              <div className="h-4 w-full rounded-full bg-gray-200 overflow-hidden shadow-inner">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">Keep up your streak! {consecutiveDays}/{data?.progressData?.totalDays ?? 0} days</p>
          </div>

          {/* Stats Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="stagger-item" style={{animationDelay: '0.2s'}}>
              <StatCard
                icon={<Calendar className="h-6 w-6" />}
                label="Consecutive Days"
                value={consecutiveDays}
                color="blue"
              />
            </div>
            <div className="stagger-item" style={{animationDelay: '0.25s'}}>
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                label="Documents"
                value={documents}
                color="green"
              />
            </div>
            <div className="stagger-item" style={{animationDelay: '0.3s'}}>
              <StatCard
                icon={<Zap className="h-6 w-6" />}
                label="Flashcards"
                value={flashcards}
                color="yellow"
              />
            </div>
            <div className="stagger-item" style={{animationDelay: '0.35s'}}>
              <StatCard
                icon={<Brain className="h-6 w-6" />}
                label="Quizzes"
                value={quizzes}
                color="purple"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
