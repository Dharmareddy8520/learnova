// src/components/Sidebar.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { UsageOverview } from './UsageOverview'
import axios from 'axios'
import { ShoppingCart } from 'lucide-react'

type Item = { label: string; path: string };

const items: Item[] = [
  { label: "Summarization",      path: "/dashboard" },
  { label: "Document Analyzer",  path: "/analyzer" },
  { label: "Quiz Generation",    path: "/quiz-generator" },
  { label: "Q&A Assistance",     path: "/qa" },
  { label: "Flashcard Creation", path: "/flashcards" },
  { label: "Saved Content",      path: "/saved" },
  { label: "Profile",            path: "/account" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth(); // <-- auth
  const [open, setOpen] = useState(false); // mobile drawer

  // Close drawer when route changes
  useEffect(() => setOpen(false), [location.pathname]);

  const isActive = (p: string) => location.pathname.startsWith(p);

  const NavButton = ({ it }: { it: Item }) => (
    <button
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

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      // Optional: clear local usage counters here if you keep them in localStorage
      // localStorage.removeItem('usage_counters');
      navigate("/login");
    }
  };

  return (
    <>
      {/* === MOBILE TOP BAR === */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-600 text-white font-bold">
              L
            </div>
            <span className="font-semibold text-gray-900">Learnova</span>
          </div>
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg bg-indigo-50 text-indigo-700"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
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

      {/* === MOBILE SLIDE-IN DRAWER === */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-gray-200 p-4 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Learnova</h2>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <span className="block w-5 h-0.5 bg-gray-700 rotate-45 translate-y-[6px]" />
            <span className="block w-5 h-0.5 bg-gray-700 -rotate-45 -translate-y-[6px]" />
          </button>
        </div>

        <nav className="mt-2 space-y-1">
          {items.map((it) => (
            <NavButton key={it.path} it={it} />
          ))}
        </nav>

        {/* mobile usage overview */}
        <div className="mt-4">
          <UsageOverview />
        </div>

        {/* mobile footer actions */}
        <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
          {user ? (
            <>
              <button
                onClick={() => navigate("/account")}
                className="w-full flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UserIcon className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-md px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center gap-2 rounded-md px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
          )}
        </div>
      </aside>

      {/* === DESKTOP FIXED SIDEBAR === */}
      <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Learnova</h2>
        </div>

        <nav className="mt-2 space-y-1 px-2 overflow-y-auto">
          {items.map((it) => (
            <NavButton key={it.path} it={it} />
          ))}
        </nav>

        {/* desktop footer actions pinned to bottom */}
        <div className="mt-auto px-2 pb-4 pt-2 border-t border-gray-200 space-y-2">
          {/* usage overview */}
          <UsageOverview />
          {/* Upgrade CTA for non-premium users */}
          {user && user.role !== 'premium' && (
            <button
              onClick={async () => {
                try {
                  const resp = await axios.post('/api/billing/create-checkout-session')
                  const url = resp.data?.url
                  if (url) window.location.href = url
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error('Upgrade failed', e)
                  navigate('/account')
                }
              }}
              className="w-full flex items-center gap-2 rounded-md px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <ShoppingCart className="h-4 w-4" />
              Upgrade to Premium
            </button>
          )}
          {user ? (
            <>
              <button
                onClick={() => navigate("/account")}
                className="w-full flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UserIcon className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-md px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center gap-2 rounded-md px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
          )}
        </div>
      </aside>

      {/* === MOBILE BOTTOM TABS === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5">
          {items.map((it) => (
            <button
              key={it.path}
              onClick={() => navigate(it.path)}
              className="py-2.5 flex flex-col items-center justify-center text-xs"
            >
              <span
                className={
                  isActive(it.path)
                    ? "text-indigo-600 font-semibold"
                    : "text-gray-600"
                }
              >
                {it.label.split(" ")[0]}
              </span>
            </button>
          ))}
          {/* extra tab slot becomes Login/Logout on mobile */}
          {user ? (
            <button
              onClick={handleLogout}
              className="py-2.5 flex flex-col items-center justify-center text-xs text-rose-600"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="py-2.5 flex flex-col items-center justify-center text-xs text-indigo-600"
            >
              Login
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
