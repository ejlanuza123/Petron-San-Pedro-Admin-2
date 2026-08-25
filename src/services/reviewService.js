// src/services/reviewService.js
import { supabase } from '../lib/supabase';

/**
 * Fetches all product reviews with product and user profile details.
 * Falls back if admin_reply column is not yet present in Supabase schema.
 * @param {object} options
 * @param {number|null} options.ratingFilter - Filter by rating (1-5), or null for all
 * @param {string} options.searchQuery - Search term for product name or reviewer name
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getProductReviews(options = {}) {
  const { ratingFilter = null, searchQuery = '' } = options;

  const buildQuery = (selectFields) => {
    let q = supabase
      .from('product_reviews')
      .select(selectFields)
      .order('created_at', { ascending: false });

    if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
      q = q.eq('rating', ratingFilter);
    }
    return q;
  };

  const primarySelect = `
    id,
    product_id,
    user_id,
    rating,
    comment,
    replies,
    admin_reply,
    admin_replied_at,
    created_at,
    products:products!product_reviews_product_id_fkey (
      id,
      name,
      image_url
    ),
    profiles:profiles!product_reviews_user_id_fkey (
      id,
      full_name,
      email,
      avatar_url
    )
  `;

  const fallbackSelect = `
    id,
    product_id,
    user_id,
    rating,
    comment,
    created_at,
    products:products!product_reviews_product_id_fkey (
      id,
      name,
      image_url
    ),
    profiles:profiles!product_reviews_user_id_fkey (
      id,
      full_name,
      email,
      avatar_url
    )
  `;

  let { data, error } = await buildQuery(primarySelect);

  // Fallback if admin_reply column does not exist yet
  if (error && (error.code === 'PGRST204' || error.message?.includes('admin_reply'))) {
    const fallbackResult = await buildQuery(fallbackSelect);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) return { data: [], error };

  let reviews = data || [];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    reviews = reviews.filter((r) => {
      const productName = r.products?.name?.toLowerCase() || '';
      const reviewerName = r.profiles?.full_name?.toLowerCase() || '';
      const comment = r.comment?.toLowerCase() || '';
      return productName.includes(q) || reviewerName.includes(q) || comment.includes(q);
    });
  }

  return { data: reviews, error: null };
}

/**
 * Fetches all rider ratings with rider, customer profile, and delivery details.
 * Falls back if admin_reply column is not yet present in Supabase schema.
 * @param {object} options
 * @param {number|null} options.ratingFilter - Filter by rating (1-5), or null for all
 * @param {string} options.searchQuery - Search term for rider name or reviewer name
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getRiderRatings(options = {}) {
  const { ratingFilter = null, searchQuery = '' } = options;

  const buildQuery = (selectFields) => {
    let q = supabase
      .from('rider_ratings')
      .select(selectFields)
      .order('created_at', { ascending: false });

    if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
      q = q.eq('rating', ratingFilter);
    }
    return q;
  };

  const primarySelect = `
    id,
    rider_id,
    user_id,
    delivery_id,
    rating,
    comment,
    replies,
    admin_reply,
    admin_replied_at,
    created_at,
    rider:profiles!rider_ratings_rider_id_fkey (
      id,
      full_name,
      avatar_url,
      vehicle_type
    ),
    customer:profiles!rider_ratings_user_id_fkey (
      id,
      full_name,
      email,
      avatar_url
    ),
    deliveries:delivery_id (
      id,
      order_id
    )
  `;

  const fallbackSelect = `
    id,
    rider_id,
    user_id,
    delivery_id,
    rating,
    comment,
    created_at,
    rider:profiles!rider_ratings_rider_id_fkey (
      id,
      full_name,
      avatar_url,
      vehicle_type
    ),
    customer:profiles!rider_ratings_user_id_fkey (
      id,
      full_name,
      email,
      avatar_url
    ),
    deliveries:delivery_id (
      id,
      order_id
    )
  `;

  let { data, error } = await buildQuery(primarySelect);

  // Fallback if admin_reply column does not exist yet
  if (error && (error.code === 'PGRST204' || error.message?.includes('admin_reply'))) {
    const fallbackResult = await buildQuery(fallbackSelect);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) return { data: [], error };

  let ratings = data || [];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    ratings = ratings.filter((r) => {
      const riderName = r.rider?.full_name?.toLowerCase() || '';
      const customerName = r.customer?.full_name?.toLowerCase() || '';
      const comment = r.comment?.toLowerCase() || '';
      return riderName.includes(q) || customerName.includes(q) || comment.includes(q);
    });
  }

  return { data: ratings, error: null };
}

/**
 * Computes summary statistics from lists of product reviews and rider ratings.
 * @param {Array} productReviews
 * @param {Array} riderRatings
 * @returns {{
 *   avgProductRating: number,
 *   avgRiderRating: number,
 *   totalProductReviews: number,
 *   totalRiderRatings: number,
 *   productStarCounts: Record<number, number>,
 *   riderStarCounts: Record<number, number>
 * }}
 */
export function computeReviewSummary(productReviews = [], riderRatings = []) {
  const productStarCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let productSum = 0;

  productReviews.forEach((r) => {
    const rating = Math.min(5, Math.max(1, Math.round(r.rating || 0)));
    if (rating >= 1 && rating <= 5) {
      productStarCounts[rating] = (productStarCounts[rating] || 0) + 1;
      productSum += r.rating || 0;
    }
  });

  const riderStarCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let riderSum = 0;

  riderRatings.forEach((r) => {
    const rating = Math.min(5, Math.max(1, Math.round(r.rating || 0)));
    if (rating >= 1 && rating <= 5) {
      riderStarCounts[rating] = (riderStarCounts[rating] || 0) + 1;
      riderSum += r.rating || 0;
    }
  });

  const avgProductRating =
    productReviews.length > 0 ? parseFloat((productSum / productReviews.length).toFixed(1)) : 0;
  const avgRiderRating =
    riderRatings.length > 0 ? parseFloat((riderSum / riderRatings.length).toFixed(1)) : 0;

  return {
    avgProductRating,
    avgRiderRating,
    totalProductReviews: productReviews.length,
    totalRiderRatings: riderRatings.length,
    productStarCounts,
    riderStarCounts,
  };
}

/**
 * Deletes a product review (admin moderation).
 * @param {string} reviewId
 * @returns {Promise<{ error: object|null }>}
 */
export async function deleteProductReview(reviewId) {
  const { error } = await supabase.from('product_reviews').delete().eq('id', reviewId);
  return { error };
}

/**
 * Deletes a rider rating (admin moderation).
 * @param {string} ratingId
 * @returns {Promise<{ error: object|null }>}
 */
export async function deleteRiderRating(ratingId) {
  const { error } = await supabase.from('rider_ratings').delete().eq('id', ratingId);
  return { error };
}

/**
 * Adds an admin official reply to a product review.
 * @param {string} reviewId
 * @param {string} replyText
 * @param {Array} existingReplies
 * @returns {Promise<{ error: object|null }>}
 */
export async function respondToProductReview(reviewId, replyText, existingReplies = []) {
  const newMessage = {
    sender: 'admin',
    message: replyText,
    created_at: new Date().toISOString()
  };
  
  const updatedReplies = [...existingReplies, newMessage];

  const { error } = await supabase
    .from('product_reviews')
    .update({ 
      replies: updatedReplies,
      admin_reply: replyText, // keep for backward compatibility
      admin_replied_at: new Date().toISOString()
    })
    .eq('id', reviewId);

  return { error };
}

/**
 * Adds an admin official reply to a rider rating.
 * @param {string} ratingId
 * @param {string} replyText
 * @param {Array} existingReplies
 * @returns {Promise<{ error: object|null }>}
 */
export async function respondToRiderRating(ratingId, replyText, existingReplies = []) {
  const newMessage = {
    sender: 'admin',
    message: replyText,
    created_at: new Date().toISOString()
  };
  
  const updatedReplies = [...existingReplies, newMessage];

  const { error } = await supabase
    .from('rider_ratings')
    .update({ 
      replies: updatedReplies,
      admin_reply: replyText, // keep for backward compatibility
      admin_replied_at: new Date().toISOString()
    })
    .eq('id', ratingId);

  return { error };
}
