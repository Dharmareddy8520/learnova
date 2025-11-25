import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import axios from 'axios';

interface Review {
  _id: string;
  name: string;
  rating: number;
  review: string;
  createdAt: string;
  isAnonymous: boolean;
}

const RecentReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/feedback/recent?limit=6`);
        if (response.data.success) {
          setReviews(response.data.feedbacks);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [API_URL]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <p>No reviews yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {reviews.slice(0, 3).map((review) => (
        <div
          key={review._id}
          className="bg-gray-50 rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{review.name}</h4>
              <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
            </div>
            {renderStars(review.rating)}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{review.review}</p>
        </div>
      ))}
    </div>
  );
};

export default RecentReviews;
