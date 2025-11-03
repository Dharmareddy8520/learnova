// src/pages/QAPage.tsx
import React, { useState } from "react";
import axios from "axios";
import { MessageSquare, Copy, Check } from "lucide-react";
import AppSidebar from "../components/AppSidebar"; // ✅ add the global sidebar
import usePageMeta from '../hooks/usePageMeta'

type QAItem = {
  question: string;
  answer: string;
  score?: number | null;
  start?: number | null;
  end?: number | null;
};

const ui = {
  container: "max-w-6xl mx-auto px-6 py-8",
  card: "rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm transition p-6",
  field:
    "relative border border-transparent rounded-xl px-4 pt-5 pb-2 bg-white shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-300 transition-all",
  label: "absolute -top-2 left-3 bg-white px-1 text-xs font-semibold text-indigo-600",
  textarea:
    "w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none",
  input: "w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400",
  btn: "inline-flex items-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500",
  primary: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md",
  ghost: "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50",
};

export default function QAPage() {
  const [context, setContext] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: 'Ask — Learnova AI Q&A',
    description: 'Paste a passage and ask questions about it. Get answers, confidence, and highlighted evidence.',
    url: window.location.origin + '/qa',
  })

  

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!context.trim() || !question.trim()) {
      setError("Please provide both context and a question.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        "/api/qa",
        { context, question },
        { headers: { "Content-Type": "application/json" }, timeout: 30000 }
      );
      const item: QAItem = {
        question,
        answer: data?.answer ?? "",
        score: data?.score ?? null,
        start: data?.start ?? null,
        end: data?.end ?? null,
      };
      setHistory((h) => [item, ...h].slice(0, 12));
      setQuestion("");
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Q/A failed.");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* ✅ Global App Sidebar (mobile drawer + desktop rail) */}
      <AppSidebar />

      {/* ✅ Leave space for mobile top/bottom bars and desktop left rail */}
      {/* If your rail width differs, adjust md:ml-64 accordingly */}
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64">
        <div className={ui.container}>
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600 text-white">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Ask a Question</h1>
                <p className="text-sm text-gray-600">
                  Paste a passage, ask a question, and I’ll answer with a confidence score and highlight the evidence.
                </p>
              </div>
            </div>
          </div>

          {/* Q/A form + Answer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={ui.card}>
              <form onSubmit={ask} className="space-y-4">
                <div className={ui.field}>
                  <label htmlFor="qa-context" className={ui.label}>Context</label>
                  <textarea
                    id="qa-context"
                    className={ui.textarea}
                    placeholder="Paste the reference text / passage here…"
                    rows={8}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={ui.field}>
                  <label htmlFor="qa-question" className={ui.label}>Question</label>
                  <input
                    id="qa-question"
                    className={ui.input}
                    placeholder="What’s being asked about the context?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    type="submit"
                    disabled={!context.trim() || !question.trim() || loading}
                    className={`${ui.btn} ${ui.primary} px-6 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {loading ? "Answering…" : "Ask AI"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setContext(""); setQuestion(""); setError(null); }}
                    className={`${ui.btn} ${ui.ghost} px-6 py-2.5`}
                    disabled={loading}
                  >
                    Clear
                  </button>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 text-sm">
                    {error}
                  </div>
                )}
              </form>
            </div>

            <div className={ui.card}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Conversation</h2>

              {/* Chat area */}
              <div className="flex flex-col gap-4 mb-4 max-h-[56vh] overflow-y-auto p-2">
                {history.length === 0 ? (
                  <div className="text-gray-500 italic">Your answer will appear here after you provide context and ask a question.</div>
                ) : (
                  history
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-end">
                          <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl max-w-[80%]">{h.question}</div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-xl max-w-[80%]">
                            <div className="prose">
                              {h.answer ? (
                                h.answer.split(/\n+/).map((para, pi) => (
                                  <p key={pi} className="whitespace-pre-wrap">{para}</p>
                                ))
                              ) : (
                                "—"
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              {/* Badge: Generated vs Extracted */}
                              {h.score == null ? (
                                <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Generated</div>
                              ) : (
                                <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Extracted • {(Number(h.score) * 100).toFixed(1)}%</div>
                              )}
                              <button type="button" onClick={() => copyText(h.answer)} className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs ring-1 ring-gray-300 hover:bg-gray-50">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Chat input for follow-ups */}
              <form onSubmit={ask} className="mt-2">
                <label className="sr-only">Ask a follow-up question</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Ask a follow-up question about the context..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={loading}
                  />
                  <button type="submit" disabled={!context.trim() || !question.trim() || loading} className={`${ui.btn} ${ui.primary} px-4 py-2 disabled:opacity-60`}>
                    {loading ? "Answering…" : "Ask"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* History */}
          {!!history.length && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Q/A</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((h, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xs text-gray-500">Q:</div>
                    <div className="font-medium text-gray-900">{h.question}</div>
                    <div className="mt-2 text-xs text-gray-500">A:</div>
                    <div className="text-gray-800">{h.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
