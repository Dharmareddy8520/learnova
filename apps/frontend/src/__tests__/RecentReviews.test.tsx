import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RecentReviews from '../components/RecentReviews';
import axios from 'axios';

vi.mock('axios');

describe('RecentReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}));
    
    render(<RecentReviews />);
    
    // Should show loading spinner
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeTruthy();
  });

  it('displays reviews when loaded', async () => {
    const mockReviews = [
      {
        _id: '1',
        name: 'John Doe',
        rating: 5,
        review: 'Excellent platform!',
        createdAt: new Date().toISOString(),
        isAnonymous: false
      },
      {
        _id: '2',
        name: 'Jane Smith',
        rating: 4,
        review: 'Very helpful',
        createdAt: new Date().toISOString(),
        isAnonymous: false
      }
    ];

    vi.mocked(axios.get).mockResolvedValue({
      data: {
        success: true,
        feedbacks: mockReviews
      }
    });

    render(<RecentReviews />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.getByText('Excellent platform!')).toBeTruthy();
      expect(screen.getByText('Very helpful')).toBeTruthy();
    });
  });

  it('shows empty state when no reviews', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        success: true,
        feedbacks: []
      }
    });

    render(<RecentReviews />);

    await waitFor(() => {
      expect(screen.getByText(/No reviews yet/i)).toBeTruthy();
    });
  });

  it('displays only 3 reviews max', async () => {
    const mockReviews = [
      { _id: '1', name: 'User 1', rating: 5, review: 'Review 1', createdAt: new Date().toISOString(), isAnonymous: false },
      { _id: '2', name: 'User 2', rating: 4, review: 'Review 2', createdAt: new Date().toISOString(), isAnonymous: false },
      { _id: '3', name: 'User 3', rating: 5, review: 'Review 3', createdAt: new Date().toISOString(), isAnonymous: false },
      { _id: '4', name: 'User 4', rating: 3, review: 'Review 4', createdAt: new Date().toISOString(), isAnonymous: false }
    ];

    vi.mocked(axios.get).mockResolvedValue({
      data: {
        success: true,
        feedbacks: mockReviews
      }
    });

    render(<RecentReviews />);

    await waitFor(() => {
      // Should only show first 3
      expect(screen.getByText('User 1')).toBeTruthy();
      expect(screen.getByText('User 2')).toBeTruthy();
      expect(screen.getByText('User 3')).toBeTruthy();
      expect(screen.queryByText('User 4')).toBeNull();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('API Error'));

    render(<RecentReviews />);

    await waitFor(() => {
      // Should show empty state or handle error gracefully
      const content = document.body.textContent;
      expect(content).toBeTruthy();
    });
  });

  it('formats dates correctly', async () => {
    const today = new Date();
    
    const mockReviews = [
      {
        _id: '1',
        name: 'Recent User',
        rating: 5,
        review: 'Fresh review',
        createdAt: today.toISOString(),
        isAnonymous: false
      }
    ];

    vi.mocked(axios.get).mockResolvedValue({
      data: {
        success: true,
        feedbacks: mockReviews
      }
    });

    render(<RecentReviews />);

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeTruthy();
    });
  });

  it('displays star ratings correctly', async () => {
    const mockReviews = [
      {
        _id: '1',
        name: 'User',
        rating: 3,
        review: 'Good',
        createdAt: new Date().toISOString(),
        isAnonymous: false
      }
    ];

    vi.mocked(axios.get).mockResolvedValue({
      data: {
        success: true,
        feedbacks: mockReviews
      }
    });

    render(<RecentReviews />);

    await waitFor(() => {
      // Should render 5 stars total
      const stars = document.querySelectorAll('svg');
      const starElements = Array.from(stars).filter(svg => 
        svg.getAttribute('class')?.includes('h-4 w-4')
      );
      expect(starElements.length).toBeGreaterThanOrEqual(5);
    });
  });
});
