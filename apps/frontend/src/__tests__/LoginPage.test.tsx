import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  test('renders login form', () => {
    renderWithRouter(<LoginPage />)
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  test('renders OAuth buttons', () => {
    renderWithRouter(<LoginPage />)
    
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  test('renders link to signup page', () => {
    renderWithRouter(<LoginPage />)
    
    expect(screen.getByText('create a new account')).toBeInTheDocument()
  })
})
