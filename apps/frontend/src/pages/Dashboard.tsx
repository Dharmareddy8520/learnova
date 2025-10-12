import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Brain, Calendar, BookOpen, Zap, LogOut, User } from 'lucide-react'
import axios from 'axios'

interface DashboardData {
  recentDocs: any[]
  progressData: {
    consecutiveDays: number
    totalDays: number
    documentsCount: number
    flashcardsStudied: number
    quizzesCompleted: number
  }
  consecutiveDays: number
  recommendations: string[]
}

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quickPasteText, setQuickPasteText] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPaste = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickPasteText.trim()) return

    setIsSummarizing(true)
    try {
      const response = await axios.post('/api/documents/paste', {
        text: quickPasteText
      })
      setSummary(response.data.summary)
      setQuickPasteText('')
    } catch (error) {
      console.error('Failed to summarize text:', error)
      setSummary('Sorry, summarization is not available yet. This feature will be implemented in Step 3.')
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Learnova</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Consecutive Days</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.consecutiveDays || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.progressData.documentsCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Flashcards</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.progressData.flashcardsStudied || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.progressData.quizzesCompleted || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Paste Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Paste & Summarize</h2>
            <form onSubmit={handleQuickPaste} className="space-y-4">
              <div>
                <textarea
                  value={quickPasteText}
                  onChange={(e) => setQuickPasteText(e.target.value)}
                  placeholder="Paste any text here to get an instant AI summary..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={6}
                  disabled={isSummarizing}
                />
              </div>
              <button
                type="submit"
                disabled={!quickPasteText.trim() || isSummarizing}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSummarizing ? 'Summarizing...' : 'Get Summary'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
              {summary ? (
                <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
              ) : (
                <p className="text-gray-500 italic">
                  Your summary will appear here after you paste some text and click "Get Summary".
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
          <div className="space-y-3">
            {dashboardData?.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <p className="text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
