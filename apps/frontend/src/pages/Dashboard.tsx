// src/pages/Dashboard.tsx
import { useEffect } from "react";
import AppSidebar from "../components/AppSidebar";
import { PersonalDashboard } from "../components/PersonalDashboard";
import { FolderManager } from "../components/FolderManager";

const ui = {
  shell: "min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white",
  container: "max-w-6xl mx-auto px-6",
};

export default function Dashboard() {
  // SEO meta for Dashboard
  useEffect(() => {
    document.title = 'My Library — Learnova'
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (desc) desc.content = 'Your Learnova Library: your learning cards and generated content.'
  }, [])

  return (
    <div className={ui.shell}>
      {/* Global Sidebar */}
      <AppSidebar />

      <main className={`pt-14 pb-14 md:pt-0 md:pb-0 md:pl-64`}>
        <div className={`${ui.container} py-8`}>
          {/* Header */}
          <header className="mb-8 animate-slideInDown">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
              My Library
            </h1>
            <p className="mt-2 text-lg text-gray-600">Your learning cards and generated content</p>
          </header>

          {/* Folders Section */}
          <section className="mb-12 animate-slideInUp" style={{animationDelay: '0.1s'}}>
            <FolderManager />
          </section>

          {/* Your Cards Section */}
          <section className="animate-slideInUp" style={{animationDelay: '0.2s'}}>
            <PersonalDashboard />
          </section>
        </div>
      </main>
    </div>
  );
}

