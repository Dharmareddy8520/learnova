import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import LandingPage from '../pages/LandingPage'
import { vi } from 'vitest'
import axios from 'axios'

vi.mock('axios')

const renderWithRouter = (component: React.ReactElement) => {
  vi.mocked(axios.get).mockResolvedValue({ data: { user: null } })
  
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('LandingPage', () => {
  test('renders landing page with main heading', () => {
    renderWithRouter(<LandingPage />)
    
    // Text is split across multiple elements, so check for both parts
    expect(screen.getByText(/Your AI Personal/i)).toBeTruthy()
    expect(screen.getByText(/Knowledge Companion/i)).toBeTruthy()
  })

  test('renders sign up and sign in links', () => {
    renderWithRouter(<LandingPage />)
    
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  test('renders feature sections', () => {
    renderWithRouter(<LandingPage />)
    
    expect(screen.getByText('Instant Summaries')).toBeInTheDocument()
    expect(screen.getByText('Smart Flashcards')).toBeInTheDocument()
    expect(screen.getByText('AI Q&A')).toBeInTheDocument()
    expect(screen.getByText('Progress Tracking')).toBeInTheDocument()
  })
})
