import { create } from 'zustand';
import { storage } from '@/utils/storage';
import { api } from '@/api/client';
import { useAuthStore } from './useAuthStore';
import { WishlistItem } from '@/features/account/types';

const STORAGE_KEY = 'bazar_wishlist_items';

export interface WishlistProductInput {
  id?: string;
  productId?: string;
  slug?: string;
  name?: string;
  nameBn?: string;
  banglaName?: string;
  price?: number;
  originalPrice?: number;
  regularPrice?: number;
  salePrice?: number | null;
  stock?: number;
  primaryImage?: string;
  imageUrl?: string;
  images?: Array<string | { url: string }>;
  unit?: string;
  packSize?: string;
  isFresh?: boolean;
  product?: any;
}

export function normalizeWishlistItem(raw: any): WishlistItem {
  const p = raw.product || raw;
  const productId = raw.productId || p.id || raw.id;
  const slug = p.slug || raw.slug || '';
  const name = p.name || raw.name || '';
  const nameBn = p.nameBn || raw.nameBn || p.banglaName || raw.banglaName || '';
  const rawPrice = p.salePrice ?? p.price ?? raw.salePrice ?? raw.price ?? 0;
  const price = typeof rawPrice === 'number' && !isNaN(rawPrice) ? rawPrice : Number(rawPrice) || 0;
  const rawOrig = p.originalPrice ?? p.regularPrice ?? raw.originalPrice ?? raw.regularPrice ?? null;
  const originalPrice = rawOrig != null ? Number(rawOrig) : null;
  const salePrice = p.salePrice != null ? Number(p.salePrice) : null;
  const rawStock = p.stock ?? raw.stock ?? 999;
  const stock = typeof rawStock === 'number' && !isNaN(rawStock) ? rawStock : Number(rawStock) || 0;

  let imageUrl = '';
  if (typeof p.primaryImage === 'string' && p.primaryImage) {
    imageUrl = p.primaryImage;
  } else if (typeof raw.imageUrl === 'string' && raw.imageUrl) {
    imageUrl = raw.imageUrl;
  } else if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    imageUrl = typeof first === 'string' ? first : first?.url || '';
  } else if (Array.isArray(raw.images) && raw.images.length > 0) {
    const first = raw.images[0];
    imageUrl = typeof first === 'string' ? first : first?.url || '';
  }

  const unit = p.unit || raw.unit || 'pc';

  return {
    ...(typeof raw === 'object' ? raw : {}),
    id: raw.id || productId,
    userId: raw.userId || '',
    productId,
    createdAt: raw.addedAt || raw.createdAt || new Date().toISOString(),
    product: {
      id: productId,
      slug,
      name,
      nameBn,
      price,
      salePrice,
      originalPrice,
      stock,
      primaryImage: imageUrl,
      images: imageUrl ? [imageUrl] : [],
      unit,
      isFresh: Boolean(p.isFresh || raw.isFresh),
    },
  } as WishlistItem;
}

function loadSavedWishlist(): WishlistItem[] {
  try {
    const raw = storage.getObject<any[]>(STORAGE_KEY) || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeWishlistItem);
  } catch {
    return [];
  }
}

function saveWishlistToStorage(items: WishlistItem[]): void {
  try {
    storage.setObject(STORAGE_KEY, items);
  } catch {
    // ignore
  }
}

interface WishlistState {
  items: WishlistItem[];
  isLoaded: boolean;
  isInWishlist: (productId: string) => boolean;
  addItem: (product: WishlistProductInput) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggleItem: (product: WishlistProductInput) => Promise<boolean>;
  syncWishlistWithServer: () => Promise<void>;
  fetchWishlistFromServer: () => Promise<void>;
  clearWishlist: () => void;
  totalCount: () => number;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: loadSavedWishlist(),
  isLoaded: false,

  totalCount: () => get().items.length,

  isInWishlist: (productId: string) => {
    if (!productId) return false;
    return get().items.some(
      (i) => i.productId === productId || i.id === productId || i.product?.id === productId,
    );
  },

  addItem: async (product: WishlistProductInput) => {
    const item = normalizeWishlistItem(product);
    const productId = item.productId;
    if (!productId) return;

    if (get().isInWishlist(productId)) return;

    const updated = [item, ...get().items];
    saveWishlistToStorage(updated);
    set({ items: updated });

    if (useAuthStore.getState().isAuthenticated) {
      try {
        await api.post(`/customer/wishlist/${encodeURIComponent(productId)}`);
      } catch {
        // ignore conflict/network error, keep local item
      }
    }
  },

  removeItem: async (productId: string) => {
    if (!productId) return;
    const updated = get().items.filter(
      (i) => i.productId !== productId && i.id !== productId && i.product?.id !== productId,
    );
    saveWishlistToStorage(updated);
    set({ items: updated });

    if (useAuthStore.getState().isAuthenticated) {
      try {
        await api.delete(`/customer/wishlist/${encodeURIComponent(productId)}`);
      } catch {
        // ignore
      }
    }
  },

  toggleItem: async (product: WishlistProductInput) => {
    const productId = product?.productId || product?.id || (product as any)?.product?.id;
    if (!productId) return false;

    const inList = get().isInWishlist(productId);
    if (inList) {
      await get().removeItem(productId);
      return false;
    } else {
      await get().addItem(product);
      return true;
    }
  },

  syncWishlistWithServer: async () => {
    const localItems = get().items;
    try {
      // 1. Send all local/guest items to user's account
      if (localItems.length > 0) {
        await Promise.allSettled(
          localItems.map((item) =>
            api.post(`/customer/wishlist/${encodeURIComponent(item.productId)}`).catch(() => {}),
          ),
        );
      }
      // 2. Fetch latest combined wishlist from server
      await get().fetchWishlistFromServer();
    } catch {
      // ignore
    }
  },

  fetchWishlistFromServer: async () => {
    try {
      const res = await api.get<any[]>('/customer/wishlist');
      if (Array.isArray(res)) {
        const normalized = res.map(normalizeWishlistItem);
        saveWishlistToStorage(normalized);
        set({ items: normalized, isLoaded: true });
      }
    } catch {
      // keep current items if offline
    }
  },

  clearWishlist: () => {
    storage.remove(STORAGE_KEY);
    set({ items: [] });
  },
}));
