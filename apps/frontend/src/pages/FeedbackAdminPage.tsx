import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

interface Feedback {
  _id: string;
  name: string;
  email: string;
  rating: number;
  review: string;
  createdAt: string;
  isAnonymous: boolean;
  userId?: string;
}

interface Statistics {
  averageRating: number;
  totalReviews: number;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStar: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const FeedbackAdminPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFeedback(1);
    }
  }, [user]);

  const fetchFeedback = async (page: number) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/api/feedback/all?page=${page}&limit=20`, {
        withCredentials: true
      });

      if (response.data.success) {
        setFeedbacks(response.data.feedbacks);
        setStatistics(response.data.statistics);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculatePercentage = (count: number, total: number) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feedback & Reviews</h1>
              <p className="text-gray-600 mt-1">Admin Dashboard - View and analyze user feedback</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Average Rating</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statistics.averageRating ? statistics.averageRating.toFixed(1) : '0.0'}
                  </p>
                </div>
                <div className="bg-yellow-100 rounded-full p-3">
                  <Star className="h-8 w-8 text-yellow-600 fill-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statistics.totalReviews || 0}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">5-Star Reviews</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statistics.fiveStars || 0}
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating Distribution */}
        {statistics && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Rating Distribution</h2>
            <div className="space-y-3">
              {[
                { stars: 5, count: statistics.fiveStars },
                { stars: 4, count: statistics.fourStars },
                { stars: 3, count: statistics.threeStars },
                { stars: 2, count: statistics.twoStars },
                { stars: 1, count: statistics.oneStar }
              ].map((item) => (
                <div key={item.stars} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-medium text-gray-700">{item.stars}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full transition-all"
                        style={{ width: `${calculatePercentage(item.count, statistics.totalReviews)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {item.count} ({calculatePercentage(item.count, statistics.totalReviews)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">All Feedback</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {feedbacks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No feedback received yet</p>
              </div>
            ) : (
              feedbacks.map((feedback) => (
                <div key={feedback._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{feedback.name}</h3>
                        {feedback.isAnonymous && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{feedback.email}</p>
                    </div>
                    <div className="text-right">
                      {renderStars(feedback.rating)}
                      <p className="text-xs text-gray-500 mt-1">{formatDate(feedback.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mt-2">{feedback.review}</p>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchFeedback(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => fetchFeedback(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackAdminPage;
