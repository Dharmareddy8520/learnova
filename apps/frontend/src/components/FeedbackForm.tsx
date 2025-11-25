import React, { useState } from 'react';
import { Star, Send, X } from 'lucide-react';
import axios from 'axios';

interface FeedbackFormProps {
  onClose?: () => void;
  isModal?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onClose, isModal = false }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!rating) {
      setError('Please select a rating');
      return;
    }

    if (!review.trim()) {
      setError('Please write a review');
      return;
    }

    if (!isAnonymous && (!name.trim() || !email.trim())) {
      setError('Please provide your name and email');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${API_URL}/api/feedback`, {
        name: isAnonymous ? 'Anonymous' : name,
        email: isAnonymous ? 'anonymous@learnova.com' : email,
        rating,
        review,
        isAnonymous
      }, {
        withCredentials: true
      });

      setSubmitSuccess(true);
      
      // Reset form and close modal after 1.5 seconds
      setTimeout(() => {
        setName('');
        setEmail('');
        setRating(0);
        setReview('');
        setIsAnonymous(false);
        setSubmitSuccess(false);
        if (onClose) onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Thank You!</h3>
        <p className="text-gray-600 text-sm">Your feedback has been submitted.</p>
      </div>
    );
  }

  return (
    <div className={isModal ? 'relative' : ''}>
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Rate your experience
          </label>
          {renderStars()}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="anonymous" className="ml-2 text-xs text-gray-600">
            Submit anonymously
          </label>
        </div>

        {!isAnonymous && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Your name"
                required={!isAnonymous}
              />
            </div>

            <div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Your email"
                required={!isAnonymous}
              />
            </div>
          </div>
        )}

        <div>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Share your experience..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {review.length}/500 characters
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn btn-primary flex items-center justify-center gap-2 text-sm py-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
