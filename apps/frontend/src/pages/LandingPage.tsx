import { Link } from 'react-router-dom'
import { Brain, BookOpen, Zap, Shield, ArrowRight } from 'lucide-react'

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Learnova</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Your AI Personal
            <span className="text-primary-600"> Knowledge Companion</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform any text or document into interactive learning materials. 
            Get instant summaries, generate flashcards, and master your knowledge with AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn btn-primary text-lg px-8 py-3">
              Start Learning Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button className="btn btn-outline text-lg px-8 py-3">
              Watch Demo
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to learn smarter
            </h2>
            <p className="text-xl text-gray-600">
              Powerful AI tools designed to accelerate your learning journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Instant Summaries
              </h3>
              <p className="text-gray-600">
                Paste any text and get AI-generated summaries in seconds
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Smart Flashcards
              </h3>
              <p className="text-gray-600">
                Auto-generate flashcards from your documents for effective memorization
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Q&A
              </h3>
              <p className="text-gray-600">
                Ask questions about your content and get intelligent answers
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Progress Tracking
              </h3>
              <p className="text-gray-600">
                Track your learning streak and monitor your knowledge growth
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to supercharge your learning?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of learners who are already using AI to master new knowledge
          </p>
          <Link to="/signup" className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary-400" />
            <span className="ml-2 text-lg font-semibold">Learnova</span>
          </div>
          <p className="text-center text-gray-400 mt-4">
            © 2024 Learnova. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
