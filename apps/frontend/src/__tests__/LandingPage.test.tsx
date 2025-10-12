import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('LandingPage', () => {
  test('renders landing page with main heading', () => {
    renderWithRouter(<LandingPage />)
    
    expect(screen.getByText(/Your AI Personal Knowledge Companion/i)).toBeInTheDocument()
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
