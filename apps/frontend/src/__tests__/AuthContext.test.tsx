import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ReactNode } from 'react';

vi.mock('axios');

// Test component that uses auth context
function TestComponent() {
  const { user, isLoading, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? user.name : 'No User'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides auth context to children', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeTruthy();
    expect(screen.getByTestId('user')).toBeTruthy();
  });

  it('shows loading state initially', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('Loading');
  });

  it('shows no user when not authenticated', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { user: null }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('No User');
    });
  });

  it('shows user when authenticated', async () => {
    const mockUser = {
      _id: '123',
      name: 'Test User',
      email: 'test@example.com'
    };

    vi.mocked(axios.get).mockResolvedValue({
      data: { user: mockUser }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Test User');
    });
  });

  it('handles authentication check errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Auth check failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('Not Loading');
      expect(screen.getByTestId('user').textContent).toBe('No User');
    });
  });
});
