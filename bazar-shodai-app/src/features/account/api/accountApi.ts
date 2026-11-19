import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import {
  UserAddress,
  CreateAddressPayload,
  UpdateProfilePayload,
  LoyaltySummary,
  WishlistItem,
} from '../types';

// ======================== ADDRESSES ========================

export async function fetchAddressesApi(): Promise<UserAddress[]> {
  try {
    const res = await api.get<UserAddress[]>('/customer/addresses');
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function createAddressApi(payload: CreateAddressPayload): Promise<UserAddress> {
  return api.post<UserAddress>('/customer/addresses', payload);
}

export async function updateAddressApi(
  id: string,
  payload: Partial<CreateAddressPayload>,
): Promise<UserAddress> {
  return api.patch<UserAddress>(`/customer/addresses/${encodeURIComponent(id)}`, payload);
}

export async function deleteAddressApi(id: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/customer/addresses/${encodeURIComponent(id)}`);
}

export function useCustomerAddresses() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['customer-addresses'],
    queryFn: fetchAddressesApi,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAddressApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAddressPayload> }) =>
      updateAddressApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAddressApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });
}

// ======================== PROFILE ========================

export async function updateProfileApi(payload: UpdateProfilePayload) {
  return api.patch('/customer/auth/profile', payload);
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setProfile, user } = useAuthStore();

  return useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (updatedData: any) => {
      if (user && updatedData) {
        setProfile({
          ...user,
          name: updatedData.name ?? user.name,
          email: updatedData.email !== undefined ? updatedData.email : user.email,
          phone: updatedData.phone ?? user.phone,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['auth-user-profile'] });
    },
  });
}

// ======================== LOYALTY ========================

export async function fetchLoyaltySummaryApi(): Promise<LoyaltySummary | null> {
  try {
    return await api.get<LoyaltySummary>('/customer/loyalty');
  } catch {
    return null;
  }
}

export function useLoyaltySummary() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['customer-loyalty-summary'],
    queryFn: fetchLoyaltySummaryApi,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 3,
  });
}

// ======================== WISHLIST ========================

export async function fetchWishlistApi(): Promise<WishlistItem[]> {
  try {
    const res = await api.get<WishlistItem[]>('/customer/wishlist');
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function addToWishlistApi(productId: string): Promise<WishlistItem> {
  return api.post<WishlistItem>(`/customer/wishlist/${encodeURIComponent(productId)}`);
}

export async function removeFromWishlistApi(productId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/customer/wishlist/${encodeURIComponent(productId)}`);
}

export function useWishlist() {
  const items = useWishlistStore((s) => s.items);
  const fetchFromServer = useWishlistStore((s) => s.fetchWishlistFromServer);
  const { isAuthenticated } = useAuthStore();
  const [isRefetching, setIsRefetching] = useState(false);

  const refetch = useCallback(async () => {
    if (isAuthenticated) {
      setIsRefetching(true);
      try {
        await fetchFromServer();
      } finally {
        setIsRefetching(false);
      }
    }
  }, [isAuthenticated, fetchFromServer]);

  return {
    data: items,
    isLoading: false,
    refetch,
    isRefetching,
  };
}

export function useToggleWishlist() {
  const addItem = useWishlistStore((s) => s.addItem);
  const removeItem = useWishlistStore((s) => s.removeItem);

  const mutate = useCallback(
    (
      params: { productId: string; inWishlist: boolean; product?: any },
      options?: { onSuccess?: (data?: any) => void; onError?: (err?: any) => void },
    ) => {
      (async () => {
        try {
          if (params.inWishlist) {
            await removeItem(params.productId);
          } else {
            await addItem(params.product || { id: params.productId, productId: params.productId });
          }
          options?.onSuccess?.();
        } catch (err) {
          options?.onError?.(err);
        }
      })();
    },
    [addItem, removeItem],
  );

  return {
    mutate,
    mutateAsync: async (params: { productId: string; inWishlist: boolean; product?: any }) => {
      if (params.inWishlist) {
        await removeItem(params.productId);
      } else {
        await addItem(params.product || { id: params.productId, productId: params.productId });
      }
    },
  };
}
