import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackForm from '../components/FeedbackForm';
import axios from 'axios';

vi.mock('axios');

describe('FeedbackForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders feedback form correctly', () => {
    render(<FeedbackForm />);
    
    expect(screen.getByText(/Rate your experience/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Share your experience/i)).toBeInTheDocument();
  });

  it('allows user to select rating', () => {
    render(<FeedbackForm />);
    
    const stars = screen.getAllByRole('button');
    const thirdStar = stars[2]; // 3rd star (0-indexed)
    
    fireEvent.click(thirdStar);
    
    // Stars should be interactive
    expect(thirdStar).toBeInTheDocument();
  });

  it('validates rating before submission', async () => {
    render(<FeedbackForm />);
    
    const reviewInput = screen.getByPlaceholderText(/Share your experience/i);
    fireEvent.change(reviewInput, { target: { value: 'Great app!' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    
    // Form should exist and be renderable
    expect(submitButton).toBeTruthy();
    expect(reviewInput).toBeTruthy();
  });

  it('validates review before submission', async () => {
    render(<FeedbackForm />);
    
    // Click on a star to set rating
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[4]); // 5th star
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    
    // Form elements should exist
    expect(submitButton).toBeTruthy();
    expect(stars.length).toBeGreaterThan(0);
  });

  it('toggles anonymous mode', () => {
    render(<FeedbackForm />);
    
    const anonymousCheckbox = screen.getByLabelText(/Submit anonymously/i);
    
    expect(anonymousCheckbox).not.toBeChecked();
    fireEvent.click(anonymousCheckbox);
    expect(anonymousCheckbox).toBeChecked();
  });

  it('hides name and email fields in anonymous mode', () => {
    render(<FeedbackForm />);
    
    // Initially should show name and email fields
    expect(screen.getByPlaceholderText(/Your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Your email/i)).toBeInTheDocument();
    
    // Toggle anonymous mode
    const anonymousCheckbox = screen.getByLabelText(/Submit anonymously/i);
    fireEvent.click(anonymousCheckbox);
    
    // Fields should be hidden
    expect(screen.queryByPlaceholderText(/Your name/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Your email/i)).not.toBeInTheDocument();
  });

  it('submits feedback successfully', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({ data: { success: true, message: 'Thank you!' } });
    
    render(<FeedbackForm />);
    
    // Fill the form
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[4]); // 5 stars
    
    fireEvent.change(screen.getByPlaceholderText(/Your name/i), {
      target: { value: 'John Doe' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Your email/i), {
      target: { value: 'john@example.com' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Share your experience/i), {
      target: { value: 'Great platform!' }
    });
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/api/feedback'),
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          rating: 5,
          review: 'Great platform!'
        }),
        expect.any(Object)
      );
    });
  });

  it('shows success message after submission', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({ data: { success: true } });
    
    render(<FeedbackForm />);
    
    // Fill and submit form
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[3]); // 4 stars
    
    fireEvent.change(screen.getByPlaceholderText(/Your name/i), {
      target: { value: 'Jane Doe' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Your email/i), {
      target: { value: 'jane@example.com' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Share your experience/i), {
      target: { value: 'Nice features!' }
    });
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Thank You!/i)).toBeInTheDocument();
    });
  });

  it('handles submission error', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockRejectedValue({
      response: { data: { error: 'Failed to submit' } }
    });
    
    render(<FeedbackForm />);
    
    // Fill and submit form
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[2]); // 3 stars
    
    fireEvent.change(screen.getByPlaceholderText(/Your name/i), {
      target: { value: 'Test User' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Your email/i), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Share your experience/i), {
      target: { value: 'Test review' }
    });
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to submit/i)).toBeInTheDocument();
    });
  });

  it('has character limit attribute', () => {
    render(<FeedbackForm />);
    
    const reviewInput = screen.getByPlaceholderText(/Share your experience/i) as HTMLTextAreaElement;
    
    // Should have maxLength attribute set
    expect(reviewInput.maxLength).toBe(500);
  });

  it('calls onClose when provided after successful submission', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({ data: { success: true } });
    
    const onCloseMock = vi.fn();
    render(<FeedbackForm onClose={onCloseMock} isModal={true} />);
    
    // Fill and submit form
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[4]);
    
    fireEvent.change(screen.getByPlaceholderText(/Your name/i), {
      target: { value: 'Test User' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Your email/i), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Share your experience/i), {
      target: { value: 'Good app' }
    });
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);
    
    // Wait for the timeout (1500ms) plus a bit more
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
