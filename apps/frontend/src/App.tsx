import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { GlobalUsageModal } from './components/GlobalUsageModal'
import LandingPage from './pages/LandingPage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import MLTools from './pages/MLTools'
import QuizGenerator from './pages/QuizGenerator'
import ChallengeCreate from './pages/ChallengeCreate'
import FlashcardsPage from './pages/FlashcardsPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import QAPage from './pages/QAPage'
import FileSummarizerPage from './pages/FileSummarizerPage'
import DocumentAnalyzerPage from './pages/DocumentAnalyzerPage'
import SavedContentPage from './pages/SavedContentPage'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <GlobalUsageModal />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/tools" element={<MLTools />} />
          <Route path="/quiz-generator" element={<QuizGenerator />} />
          <Route path="/challenge/create" element={<ChallengeCreate />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/summarizer" element={<FileSummarizerPage />} />
          <Route path="/analyzer" element={<DocumentAnalyzerPage />} />
          <Route path="/account" element={<ProfilePage />} />
          <Route path="/qa" element={<QAPage />} />
          <Route 
            path="/saved" 
            element={
              <ProtectedRoute>
                <SavedContentPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
