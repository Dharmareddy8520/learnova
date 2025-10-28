import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "lucide-react";

type Item = { label: string; path: string };

const items: Item[] = [
  { label: "Summarization", path: "/dashboard" },
  { label: "Quiz Generation", path: "/quiz-generator" },
  { label: "Q&A Assistance", path: "/qa" },
  { label: "Flashcard Creation", path: "/flashcards" },
  { label: "Profile", path: "/account" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const isActive = (p: string) => location.pathname.startsWith(p);

  const NavButton = ({ it }: { it: Item }) => (
    <button
      key={it.path}
      onClick={() => navigate(it.path)}
      className={[
        "w-full text-left rounded-md px-4 py-2 text-sm transition",
        isActive(it.path)
          ? "bg-indigo-100 text-indigo-700 font-semibold"
          : "text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {it.label}
    </button>
  );

  return (
    <>
      {/* === MOBILE TOP BAR === */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-600 text-white font-bold">
              L
            </div>
            <span className="font-semibold text-gray-900">Learnova</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg bg-indigo-50 text-indigo-700"
          >
            <div className="space-y-1">
              <div className="w-5 h-0.5 bg-current"></div>
              <div className="w-5 h-0.5 bg-current"></div>
              <div className="w-5 h-0.5 bg-current"></div>
            </div>
          </button>
        </div>
      </div>

      {/* === MOBILE OVERLAY === */}
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      {/* === MOBILE DRAWER === */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-gray-200 p-4 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Study Buddy AI</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <span className="block w-5 h-0.5 bg-gray-700 rotate-45 translate-y-[6px]"></span>
            <span className="block w-5 h-0.5 bg-gray-700 -rotate-45 -translate-y-[6px]"></span>
          </button>
        </div>

        <nav className="mt-2 space-y-1">
          {items.map((it) => (
            <NavButton key={it.path} it={it} />
          ))}
        </nav>
      </aside>

      {/* === DESKTOP SIDEBAR === */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" /> Study Buddy AI
          </h2>
        </div>
        <nav className="mt-2 space-y-1 px-2">
          {items.map((it) => (
            <NavButton key={it.path} it={it} />
          ))}
        </nav>
      </aside>

      {/* === MOBILE BOTTOM NAV === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5">
          {items.map((it) => (
            <button
              key={it.path}
              onClick={() => navigate(it.path)}
              className="py-2.5 flex flex-col items-center justify-center text-xs"
            >
              <span
                className={`${
                  isActive(it.path)
                    ? "text-indigo-600 font-semibold"
                    : "text-gray-600"
                }`}
              >
                {it.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
