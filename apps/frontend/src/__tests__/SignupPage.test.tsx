import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import SignupPage from '../pages/SignupPage'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('SignupPage', () => {
  test('renders signup form', () => {
    renderWithRouter(<SignupPage />)
    
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
  })

  test('renders OAuth buttons', () => {
    renderWithRouter(<SignupPage />)
    
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  test('renders link to login page', () => {
    renderWithRouter(<SignupPage />)
    
    expect(screen.getByText('sign in to your existing account')).toBeInTheDocument()
  })
})
