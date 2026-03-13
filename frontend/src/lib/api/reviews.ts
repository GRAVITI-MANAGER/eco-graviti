// frontend/src/lib/api/reviews.ts

import { apiClient } from './client';
import { Review, PaginatedResponse } from '@/types';

/**
 * Obtener reviews de un producto
 */
export async function getProductReviews(productId: number, rating?: number): Promise<Review[]> {
  const params: Record<string, number> = {};
  if (rating) params.rating = rating;
  
  const { data } = await apiClient.get<PaginatedResponse<Review>>(
    `/products/${productId}/reviews/`,
    { params }
  );
  return data.results;
}

/**
 * Obtener reviews de un servicio
 */
export async function getServiceReviews(serviceId: number, rating?: number): Promise<Review[]> {
  const params: Record<string, number> = {};
  if (rating) params.rating = rating;

  const { data } = await apiClient.get<PaginatedResponse<Review>>(
    `/services/list/${serviceId}/reviews/`,
    { params }
  );
  return data.results;
}

/**
 * Verificar si puede hacer review
 */
export async function canReview(itemId: number, itemType: 'product' | 'service'): Promise<{
  can_review: boolean;
  has_purchased: boolean;
  reason?: string;
  message?: string;
  existing_review?: Review;
}> {
  const params: Record<string, number> = {};
  if (itemType === 'product') {
    params.product_id = itemId;
  } else {
    params.service_id = itemId;
  }
  
  const { data } = await apiClient.get('/reviews/can-review/', { params });
  return data;
}

/**
 * Crear review
 */
export async function createReview(reviewData: {
  product_id?: number;
  service_id?: number;
  rating: number;
  title?: string;
  comment: string;
  images?: File[];
}): Promise<Review> {
  const formData = new FormData();
  
  if (reviewData.product_id) {
    formData.append('product_id', reviewData.product_id.toString());
  }
  if (reviewData.service_id) {
    formData.append('service_id', reviewData.service_id.toString());
  }
  
  formData.append('rating', reviewData.rating.toString());
  if (reviewData.title) {
    formData.append('title', reviewData.title);
  }
  formData.append('comment', reviewData.comment);
  
  if (reviewData.images) {
    reviewData.images.forEach((image) => {
      formData.append('images', image);
    });
  }
  
  const { data } = await apiClient.post<Review>('/reviews/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return data;
}

/**
 * Marcar review como útil
 */
export async function toggleReviewHelpful(reviewId: number): Promise<{
  message: string;
  helpful_count: number;
  has_voted: boolean;
}> {
  const { data } = await apiClient.post(`/reviews/${reviewId}/helpful/`);
  return data;
}

/**
 * Obtener mis reviews
 */
export async function getMyReviews(): Promise<Review[]> {
  const { data } = await apiClient.get<Review[]>('/reviews/my-reviews/');
  return data;
}