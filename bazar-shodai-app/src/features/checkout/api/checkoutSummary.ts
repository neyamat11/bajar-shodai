import { api } from '@/api/client';
import { useCartStore } from '@/store/useCartStore';

export interface LoyaltyQuote {
  enabled: boolean;
  pointsEarned: number;
  userPoints: number;
  pointsRedeemed: number;
  pointsDiscountAmount: number;
  minOrderAmountToRedeem: number;
  minPointsToRedeem: number;
  canRedeem: boolean;
  redemptionError?: string;
  milestone?: {
    enabled: boolean;
    eligible: boolean;
    freeShippingApplied: boolean;
    weightExceeded: boolean;
    orderWeightKg: number;
    maxWeightKg: number;
    deliveredCount: number;
    interval: number;
  };
  weightExceeded?: boolean;
  orderWeightKg?: number;
}

export interface CheckoutSummaryResponse {
  items: {
    cartItemId: string;
    productId: string;
    variantId: string | null;
    name: string;
    slug: string;
    image: string | null;
    variantName: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    availableStock: number;
    issue: string | null;
  }[];
  itemCount: number;
  subtotal: number;
  shipping: {
    available: boolean;
    distanceKm?: number;
    durationSec?: number;
    calculatedFee?: number;
    block?: string | null;
    isAbroad?: boolean;
    isPendingFee?: boolean;
    amountForFreeDelivery?: number;
    freeDeliveryThreshold?: number;
  };
  coupon: {
    applied: boolean;
    code: string;
    description: string | null;
    discountType: string;
    discount: number;
    shippingDiscount: number;
  } | null;
  discountAmount: number;
  pointsDiscountAmount?: number;
  pointsRedeemed?: number;
  pointsEarned?: number;
  orderWeightKg?: number;
  isHeavyOrder?: boolean;
  heavyOrderReason?: string;
  loyalty?: LoyaltyQuote;
  shippingCost: number;
  taxAmount: number;
  total: number;
  paymentMethods: ('CASH_ON_DELIVERY' | 'BKASH' | 'NAGAD' | 'ROCKET')[];
  minOrderAmount: number;
  minOrderOk: boolean;
  shopOpen: boolean;
  canPlaceOrder: boolean;
  issues: string[];
}

export interface SummaryInput {
  couponCode?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  redeemPoints?: number;
  skipLocation?: boolean;
  isAbroadOrder?: boolean;
}

/**
 * Fetches real-time server calculated checkout summary.
 * Exactly mirrors public web checkout summary API.
 */
export async function fetchCheckoutSummaryApi(input: SummaryInput = {}): Promise<CheckoutSummaryResponse> {
  // Sync cart items with server first if not already present
  const localItems = useCartStore.getState().items;
  if (localItems.length > 0) {
    try {
      const serverCart = await api.get<{ items?: Array<{ id: string; productId: string; quantity: number }> }>('/customer/cart');
      const serverItemProductIds = new Set((serverCart?.items || []).map((i) => i.productId));
      for (const item of localItems) {
        if (!serverItemProductIds.has(item.productId)) {
          await api.post('/customer/cart', { productId: item.productId, quantity: item.quantity }).catch(() => {});
        }
      }
    } catch {
      // Continue anyway
    }
  }

  return api.post<CheckoutSummaryResponse>('/customer/checkout/summary', input);
}

/**
 * Validates and applies coupon against current cart and location on the backend.
 */
export async function applyCouponApi(couponCode: string, input: SummaryInput = {}): Promise<CheckoutSummaryResponse> {
  return api.post<CheckoutSummaryResponse>('/customer/coupons/apply', {
    ...input,
    couponCode,
  });
}
