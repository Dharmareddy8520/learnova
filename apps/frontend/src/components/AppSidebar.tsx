import { useLocation, useNavigate } from "react-router-dom";

type Item = { label: string; path: string };

const items: Item[] = [
  { label: "Summarization", path: "/dashboard" },
  { label: "Quiz Generation", path: "/quiz-generator" },
  { label: "Q&A Assistance", path: "/qa" },
  { label: "Flashcard Creation", path: "/flashcards" },
];

export default function Sidebar() {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white">
      <div className="px-6 py-5">
        <h2 className="text-lg font-semibold text-gray-900">Study Buddy AI</h2>
      </div>
      <nav className="mt-2 space-y-1 px-2">
        {items.map((it) => {
          const active = loc.pathname.startsWith(it.path);
          return (
            <button
              key={it.path}
              onClick={() => nav(it.path)}
              className={[
                "w-full text-left rounded-md px-4 py-2 text-sm transition",
                active
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {it.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
