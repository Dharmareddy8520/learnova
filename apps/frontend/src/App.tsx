import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { GlobalUsageModal } from './components/GlobalUsageModal'
import LandingPage from './pages/LandingPage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import MLTools from './pages/MLTools'
import QuizGenerator from './pages/QuizGenerator'
import FlashcardsPage from './pages/FlashcardsPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import QAPage from './pages/QAPage'

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
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/account" element={<ProfilePage />} />
          <Route path="/qa" element={<QAPage />} />
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
