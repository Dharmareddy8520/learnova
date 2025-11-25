import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import * as AuthContext from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext');

describe('ProtectedRoute', () => {
  it('shows loading state when auth is loading', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn()
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    // Should show loading state
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeTruthy();
  });

  it('renders children when user is authenticated', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { _id: '123', name: 'Test User', email: 'test@example.com' } as any,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn()
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeTruthy();
  });

  it('redirects to login when user is not authenticated', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn()
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    // Should not render protected content
    expect(screen.queryByText('Protected Content')).toBeNull();
  });
});
