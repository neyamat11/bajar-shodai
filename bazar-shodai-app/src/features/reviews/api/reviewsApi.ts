import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export interface ProductReviewItem {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  userName?: string;
  userAvatar?: string;
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  createdAt: string;
  images?: string[];
}

export interface ProductReviewsResponse {
  data: ProductReviewItem[];
  total: number;
  averageRating: number;
  ratingBreakdown?: Record<number, number>;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
  imageIds?: string[];
  images?: string[];
}

export interface UploadReviewImageResponse {
  id: string;
  key: string;
  url: string;
}

export async function uploadReviewImageApi(fileUri: string): Promise<UploadReviewImageResponse> {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'review.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match && match[1] ? match[1].toLowerCase() : 'jpg';
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  formData.append('files', {
    uri: fileUri,
    name: filename,
    type,
  } as unknown as Blob);

  const res = await api.post<UploadReviewImageResponse[]>('/customer/uploads/review-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const first = Array.isArray(res) && res.length > 0 ? res[0] : (res as any);
  if (!first) {
    throw new Error('Failed to upload review image');
  }
  return first;
}

export async function fetchProductReviewsApi(
  productId: string,
  page = 1,
  limit = 10,
): Promise<ProductReviewsResponse> {
  return api.get<ProductReviewsResponse>(
    `/customer/products/${encodeURIComponent(productId)}/reviews?page=${page}&limit=${limit}`,
  );
}

export async function createProductReviewApi(
  payload: CreateReviewPayload,
): Promise<ProductReviewItem> {
  let imageIds = payload.imageIds ? [...payload.imageIds] : [];

  // Upload local images first if provided
  if (payload.images && payload.images.length > 0) {
    const uploadPromises = payload.images.map((uri) => uploadReviewImageApi(uri));
    const results = await Promise.all(uploadPromises);
    const uploadedIds = results.map((r) => r.id).filter(Boolean);
    imageIds = [...imageIds, ...uploadedIds];
  }

  return api.post<ProductReviewItem>('/customer/reviews', {
    productId: payload.productId,
    rating: payload.rating,
    title: payload.title?.trim() || undefined,
    comment: payload.comment.trim(),
    imageIds: imageIds.length > 0 ? imageIds : undefined,
  });
}

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => fetchProductReviewsApi(productId),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductReviewApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-detail'] });
    },
  });
}
