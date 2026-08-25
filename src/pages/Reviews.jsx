// src/pages/Reviews.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Star, 
  MessageSquare, 
  Package, 
  Truck, 
  Trash2, 
  Filter, 
  Search, 
  User, 
  CheckCircle, 
  RefreshCw,
  CornerDownRight,
  Send,
  ShieldCheck,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import SearchBar from '../components/common/SearchBar';
import AlertModal from '../components/common/AlertModal';
import { useTheme } from '../context/ThemeContext';
import { notifySuccess } from '../utils/successNotifier';
import {
  getProductReviews,
  getRiderRatings,
  computeReviewSummary,
  deleteProductReview,
  deleteRiderRating,
  respondToProductReview,
  respondToRiderRating
} from '../services/reviewService';

const StarRating = ({ rating, size = 16 }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(<Star key={i} size={size} className="fill-amber-400 text-amber-400" />);
    } else if (i === fullStars + 1 && hasHalfStar) {
      stars.push(<Star key={i} size={size} className="fill-amber-400/50 text-amber-400" />);
    } else {
      stars.push(<Star key={i} size={size} className="text-gray-300 dark:text-slate-600" />);
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const RATING_FILTERS = [
  { key: null, label: 'All Stars' },
  { key: 5, label: '5 ★' },
  { key: 4, label: '4 ★' },
  { key: 3, label: '3 ★' },
  { key: 2, label: '2 ★' },
  { key: 1, label: '1 ★' },
];

export default function Reviews() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'riders'
  const [productReviews, setProductReviews] = useState([]);
  const [riderRatings, setRiderRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reply Modal State
  const [replyingItem, setReplyingItem] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [pRes, rRes] = await Promise.all([
        getProductReviews({ ratingFilter, searchQuery }),
        getRiderRatings({ ratingFilter, searchQuery }),
      ]);

      if (pRes.error) throw pRes.error;
      if (rRes.error) throw rRes.error;

      setProductReviews(pRes.data || []);
      setRiderRatings(rRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = useMemo(
    () => computeReviewSummary(productReviews, riderRatings),
    [productReviews, riderRatings]
  );

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      if (deletingItem.type === 'product') {
        const { error } = await deleteProductReview(deletingItem.id);
        if (error) throw error;
        notifySuccess('Product review deleted');
      } else {
        const { error } = await deleteRiderRating(deletingItem.id);
        if (error) throw error;
        notifySuccess('Rider rating deleted');
      }
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete review');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
    }
  };

  const handleOpenReplyModal = (item, type) => {
    setReplyingItem({ ...item, type });
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!replyingItem || !replyText.trim()) return;
    try {
      setIsSubmittingReply(true);
      const existingReplies = replyingItem.replies || [];
      if (replyingItem.type === 'product') {
        const { error } = await respondToProductReview(replyingItem.id, replyText.trim(), existingReplies);
        if (error) throw error;
        notifySuccess('Official reply posted to product review!');
      } else {
        const { error } = await respondToRiderRating(replyingItem.id, replyText.trim(), existingReplies);
        if (error) throw error;
        notifySuccess('Official reply posted to rider rating!');
      }
      setReplyingItem(null);
      setReplyText('');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Customer Ratings &amp; Reviews Dashboard
          </h2>
          <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Analyze ratings, post official store responses, and moderate feedback
          </p>
        </div>
        <button
          onClick={fetchData}
          className={`p-2 rounded-lg border flex items-center gap-2 text-sm font-medium transition-colors ${
            isDarkMode
              ? 'border-slate-700 text-gray-300 hover:bg-slate-800'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title="Refresh reviews"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Product Rating</p>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {summary.avgProductRating > 0 ? `${summary.avgProductRating} ★` : '—'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Rider Rating</p>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {summary.avgRiderRating > 0 ? `${summary.avgRiderRating} ★` : '—'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'}`} />
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Product Reviews</p>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'}`}>{summary.totalProductReviews}</p>
        </div>

        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Truck size={16} className="text-emerald-500" />
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rider Ratings</p>
          </div>
          <p className="text-2xl font-bold text-emerald-500">{summary.totalRiderRatings}</p>
        </div>
      </div>

      {/* Rating Analytics Star Breakdown */}
      <div className={`p-5 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <h3 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {activeTab === 'products' ? 'Product Rating Distribution' : 'Rider Rating Distribution'}
        </h3>
        
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const counts = activeTab === 'products' ? summary.productStarCounts : summary.riderStarCounts;
            const total = activeTab === 'products' ? summary.totalProductReviews : summary.totalRiderRatings;
            const count = counts[star] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-8 font-semibold text-gray-500">{star} ★</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right font-medium text-gray-600 dark:text-gray-400">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main Tab Switcher */}
        <div className={`flex gap-1 p-1 rounded-xl transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
          <button
            id="reviews-tab-products"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'products'
                ? 'bg-[#0033A0] text-white shadow-md'
                : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            <Package size={16} /> Product Reviews ({productReviews.length})
          </button>
          <button
            id="reviews-tab-riders"
            onClick={() => setActiveTab('riders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'riders'
                ? 'bg-[#0033A0] text-white shadow-md'
                : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            <Truck size={16} /> Rider Ratings ({riderRatings.length})
          </button>
        </div>

        {/* Rating Filter Pills */}
        <div className={`flex gap-1 p-1 rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
          {RATING_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setRatingFilter(f.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                ratingFilter === f.key
                  ? 'bg-amber-400 text-gray-900 font-bold shadow-sm'
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        onSearch={setSearchQuery}
        placeholder={activeTab === 'products' ? "Search product name, customer, or comment..." : "Search rider name, customer, or comment..."}
        className="w-full"
      />

      {/* Main Content List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-24 rounded-xl animate-pulse ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : activeTab === 'products' ? (
        productReviews.length === 0 ? (
          <div className={`rounded-xl border p-12 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <MessageSquare size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No product reviews found</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {ratingFilter || searchQuery ? 'Try adjusting your filters or search' : 'No customer product reviews have been submitted yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {productReviews.map((review) => (
              <div
                key={review.id}
                className={`p-5 rounded-xl border transition-all duration-200 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {review.products?.image_url ? (
                      <img src={review.products.image_url} alt={review.products.name} className="w-12 h-12 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-[#0033A0]">
                        <Package size={24} />
                      </div>
                    )}
                    <div>
                      <h4 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {review.products?.name || 'Unknown Product'}
                      </h4>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        By {review.profiles?.full_name || 'Customer'} • {review.profiles?.email || 'No email'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end mr-2">
                      <StarRating rating={review.rating} size={18} />
                      <span className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenReplyModal(review, 'product')}
                      className="px-3 py-1.5 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs font-semibold flex items-center gap-1 transition"
                      title="Reply to Review"
                    >
                      <CornerDownRight size={14} /> {(review.replies && review.replies.length > 0) ? 'View Thread' : 'Reply'}
                    </button>

                    <button
                      onClick={() => setDeletingItem({ ...review, type: 'product' }) || setIsDeleteModalOpen(true)}
                      className={`p-2 rounded-lg border transition-colors ${
                        isDarkMode ? 'border-slate-700 text-red-400 hover:bg-red-900/30' : 'border-gray-200 text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete / Moderate Review"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {review.comment ? (
                  <p className={`text-sm p-3 rounded-lg mb-2 ${isDarkMode ? 'bg-slate-700/50 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                    "{review.comment}"
                  </p>
                ) : (
                  <p className={`text-xs italic mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No written comment provided.</p>
                )}

                {/* Official Store Response or Thread */}
                {(review.admin_reply || (review.replies && review.replies.length > 0)) && (
                  <div className={`p-3 rounded-lg border flex items-start gap-2 mt-2 ${isDarkMode ? 'bg-blue-950/40 border-blue-800/60 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                    <ShieldCheck size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'} mt-0.5 flex-shrink-0`} />
                    <div className="w-full">
                      <p className={`text-xs font-bold ${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'}`}>
                        {review.replies && review.replies.length > 0 ? `Conversation Thread (${review.replies.length + 1}) - Latest Reply` : 'Official Store Response'}
                      </p>
                      <p className="text-xs mt-0.5">
                        {review.replies && review.replies.length > 0 ? review.replies[review.replies.length - 1].message : review.admin_reply}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : riderRatings.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <Truck size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No rider ratings found</h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {ratingFilter || searchQuery ? 'Try adjusting your filters or search' : 'No customer rider ratings have been submitted yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {riderRatings.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-xl border transition-all duration-200 ${
                isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {item.rider?.avatar_url ? (
                    <img src={item.rider.avatar_url} alt={item.rider.full_name} className="w-12 h-12 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-emerald-600">
                      <Truck size={24} />
                    </div>
                  )}
                  <div>
                    <h4 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Rider: {item.rider?.full_name || 'Rider'}
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Rated by {item.customer?.full_name || 'Customer'} • Order #{item.deliveries?.order_id || item.delivery_id || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end mr-2">
                    <StarRating rating={item.rating} size={18} />
                    <span className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenReplyModal(item, 'rider')}
                    className="px-3 py-1.5 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs font-semibold flex items-center gap-1 transition"
                    title="Reply to Rating"
                  >
                    <CornerDownRight size={14} /> {(item.replies && item.replies.length > 0) ? 'View Thread' : 'Reply'}
                  </button>

                  <button
                    onClick={() => setDeletingItem({ ...item, type: 'rider' }) || setIsDeleteModalOpen(true)}
                    className={`p-2 rounded-lg border transition-colors ${
                      isDarkMode ? 'border-slate-700 text-red-400 hover:bg-red-900/30' : 'border-gray-200 text-red-600 hover:bg-red-50'
                    }`}
                    title="Delete / Moderate Rating"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {item.comment ? (
                <p className={`text-sm p-3 rounded-lg mb-2 ${isDarkMode ? 'bg-slate-700/50 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                  "{item.comment}"
                </p>
              ) : (
                <p className={`text-xs italic mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No written comment provided.</p>
              )}

              {/* Official Store Response or Thread */}
              {(item.admin_reply || (item.replies && item.replies.length > 0)) && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 mt-2 ${isDarkMode ? 'bg-blue-950/40 border-blue-800/60 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                  <ShieldCheck size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'} mt-0.5 flex-shrink-0`} />
                  <div className="w-full">
                    <p className={`text-xs font-bold ${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'}`}>
                      {item.replies && item.replies.length > 0 ? `Conversation Thread (${item.replies.length + 1}) - Latest Reply` : 'Official Store Response'}
                    </p>
                    <p className="text-xs mt-0.5">
                      {item.replies && item.replies.length > 0 ? item.replies[item.replies.length - 1].message : item.admin_reply}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin Reply Modal */}
      {replyingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-xl shadow-2xl p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Post Official Store Response
            </h3>
            <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Replying to customer feedback for {replyingItem.type === 'product' ? (replyingItem.products?.name || 'Product') : (replyingItem.rider?.full_name || 'Rider')}
            </p>

            <div className={`mb-4 max-h-60 overflow-y-auto space-y-3 p-3 border rounded-lg ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
              {/* Original Review */}
              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs font-semibold text-gray-500">Customer</span>
                <p className={`text-sm p-2 rounded-lg max-w-[85%] ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-black'}`}>
                  {replyingItem.comment || '(No comment provided)'}
                </p>
              </div>
              
              {/* Replies Thread */}
              {replyingItem.replies && replyingItem.replies.map((msg, idx) => (
                <div key={idx} className={`flex flex-col gap-1 ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs font-semibold text-gray-500">{msg.sender === 'admin' ? 'Official Store' : 'Customer'}</span>
                  <p className={`text-sm p-2 rounded-lg max-w-[85%] ${msg.sender === 'admin' ? 'bg-[#0033A0] text-white' : (isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-black')}`}>
                    {msg.message}
                  </p>
                </div>
              ))}

              {/* Fallback for legacy admin_reply */}
              {(!replyingItem.replies || replyingItem.replies.length === 0) && replyingItem.admin_reply && (
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-xs font-semibold text-gray-500">Official Store</span>
                  <p className="text-sm p-2 rounded-lg max-w-[85%] bg-[#0033A0] text-white">
                    {replyingItem.admin_reply}
                  </p>
                </div>
              )}
            </div>

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Type official store response..."
              className={`w-full p-3 border rounded-lg outline-none text-sm mb-4 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReplyingItem(null)}
                className={`px-4 py-2 border rounded-lg text-sm font-medium ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={isSubmittingReply || !replyText.trim()}
                className="px-4 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={14} />
                {isSubmittingReply ? 'Posting...' : 'Post Official Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deletingItem?.type === 'product' ? 'Product Review' : 'Rider Rating'}`}
        message={`Are you sure you want to delete this ${deletingItem?.type === 'product' ? 'product review' : 'rider rating'}? This action cannot be undone.`}
        type="warning"
        showCancelButton={true}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        loading={isDeleting}
      />
    </div>
  );
}
