import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Price } from '@/components/ui/Price';
import { haptics } from '@/services/haptics';

export interface CheckoutSummaryData {
  subtotal: number;
  deliveryCost: number;
  isFreeDelivery: boolean;
  distanceKm?: number;
  isPendingFee?: boolean;
  isLocationPending?: boolean;
  coupon?: {
    code: string;
    discount: number;
    description?: string;
  } | null;
  loyalty?: {
    enabled: boolean;
    userPoints: number;
    pointsRedeemed: number;
    pointsDiscountAmount: number;
    pointsEarned: number;
    canRedeem: boolean;
    minOrderAmountToRedeem: number;
    minPointsToRedeem: number;
    milestone?: {
      freeShippingApplied: boolean;
      maxWeightKg: number;
    };
    weightExceeded?: boolean;
    orderWeightKg?: number;
  } | null;
  pointsDiscountAmount?: number;
  grandTotal: number;
}

interface CheckoutOrderSummaryProps {
  summary: CheckoutSummaryData;
  onApplyCoupon?: (code: string) => Promise<void>;
  onRemoveCoupon?: () => void;
  onTogglePoints?: (apply: boolean) => void;
  pointsApplied?: boolean;
  couponLoading?: boolean;
}

/**
 * Mobile Checkout Order Summary & Live Calculations.
 * Exact parity with public storefront's OrderSummaryPanel:
 * - Live coupon application & removal
 * - Loyalty points redemption toggle
 * - Milestone free shipping badges
 * - Accurate dynamic delivery fee & Grand Total
 */
export function CheckoutOrderSummary({
  summary,
  onApplyCoupon,
  onRemoveCoupon,
  onTogglePoints,
  pointsApplied = false,
  couponLoading = false,
}: CheckoutOrderSummaryProps) {
  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!couponInput.trim() || !onApplyCoupon) return;
    try {
      setIsApplying(true);
      setCouponError(null);
      haptics.selection();
      await onApplyCoupon(couponInput.trim().toUpperCase());
      setCouponInput('');
      haptics.success();
    } catch (err: any) {
      haptics.error();
      setCouponError(err?.message || 'কুপনটি প্রযোজ্য নয়');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="Receipt" size={16} color="#0b6234" />
        <Text style={styles.headerTitle}>অর্ডার সারাংশ (Order Summary)</Text>
      </View>

      {/* Milestone Free Shipping Banner */}
      {summary.loyalty?.milestone?.freeShippingApplied && (
        <View style={styles.milestoneBadge}>
          <Text style={styles.milestoneIcon}>🎉</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.milestoneTitle}>মাইলস্টোন ১০০% ফ্রি ডেলিভারি আনলক হয়েছে!</Text>
            <Text style={styles.milestoneSub}>
              আপনার অর্ডারে সর্বোচ্চ {summary.loyalty.milestone.maxWeightKg} কেজি পর্যন্ত ফ্রি ডেলিভারি প্রযোজ্য।
            </Text>
          </View>
        </View>
      )}

      {/* Weight Limit Notice */}
      {summary.loyalty?.weightExceeded && (
        <View style={styles.weightBadge}>
          <Text style={styles.milestoneIcon}>⚖️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.weightTitle}>ওজন সীমা অতিক্রম করেছে</Text>
            <Text style={styles.weightSub}>
              কার্টের মোট ওজন ({summary.loyalty.orderWeightKg} কেজি) সীমা ছাড়িয়ে যাওয়ায় নিয়মিত ডেলিভারি চার্জ প্রযোজ্য।
            </Text>
          </View>
        </View>
      )}

      {/* Loyalty Points Box */}
      {summary.loyalty?.enabled && summary.loyalty.userPoints > 0 && (
        <View style={styles.pointsBox}>
          <View style={styles.pointsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={{ fontSize: 16 }}>⭐</Text>
              <View>
                <Text style={styles.pointsLabel}>
                  লয়্যালটি পয়েন্ট: <Text style={styles.pointsCount}>{summary.loyalty.userPoints}</Text>
                </Text>
                <Text style={styles.pointsSub}>
                  (সমপরিমাণ ৳{Math.floor(summary.loyalty.userPoints / 10)} ছাড়)
                </Text>
              </View>
            </View>

            {summary.loyalty.canRedeem && onTogglePoints && (
              <TouchableOpacity
                onPress={() => {
                  haptics.selection();
                  onTogglePoints(!pointsApplied);
                }}
                style={[
                  styles.pointsBtn,
                  pointsApplied && styles.pointsBtnRemove,
                ]}
              >
                <Text style={[styles.pointsBtnText, pointsApplied && styles.pointsBtnTextRemove]}>
                  {pointsApplied ? 'মুছে ফেলুন' : 'ব্যবহার করুন'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {pointsApplied && (summary.pointsDiscountAmount ?? 0) > 0 && (
            <Text style={styles.pointsSuccessText}>
              ✓ {summary.loyalty.pointsRedeemed || summary.loyalty.userPoints} পয়েন্ট দিয়ে ৳{summary.pointsDiscountAmount} ছাড় প্রয়োগ হয়েছে
            </Text>
          )}

          {!summary.loyalty.canRedeem && summary.subtotal < summary.loyalty.minOrderAmountToRedeem && (
            <Text style={styles.pointsNoticeText}>
              💡 পয়েন্ট ব্যবহারের জন্য আরও ৳{summary.loyalty.minOrderAmountToRedeem - summary.subtotal}-এর অর্ডার প্রয়োজন (ন্যূনতম ৳{summary.loyalty.minOrderAmountToRedeem})।
            </Text>
          )}
        </View>
      )}

      {/* Coupon Application Box */}
      {summary.coupon?.code ? (
        <View style={styles.appliedCouponRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Icon name="Tag" size={15} color="#15803d" />
            <Text style={styles.appliedCouponText}>
              কুপন: <Text style={{ fontWeight: '800' }}>{summary.coupon.code}</Text> (-৳{summary.coupon.discount.toFixed(0)})
            </Text>
          </View>
          {onRemoveCoupon && (
            <TouchableOpacity onPress={onRemoveCoupon}>
              <Text style={styles.removeCouponText}>মুছে ফেলুন</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.couponForm}>
          <TextInput
            style={styles.couponInput}
            placeholder="কুপন কোড লিখুন"
            placeholderTextColor="#9ca3af"
            value={couponInput}
            onChangeText={setCouponInput}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.couponApplyBtn, (!couponInput.trim() || isApplying || couponLoading) && styles.couponApplyBtnDisabled]}
            onPress={handleApply}
            disabled={!couponInput.trim() || isApplying || couponLoading}
          >
            {isApplying || couponLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.couponApplyBtnText}>প্রয়োগ</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}

      {/* Price Lines */}
      <View style={styles.breakdown}>
        <View style={styles.line}>
          <Text style={styles.label}>সাবটোটাল (Subtotal)</Text>
          <Price amount={summary.subtotal} size="sm" />
        </View>

        {summary.coupon?.discount ? (
          <View style={styles.line}>
            <Text style={styles.discountLabel}>কুপন ছাড় ({summary.coupon.code})</Text>
            <Text style={styles.discountValue}>-৳{summary.coupon.discount.toFixed(0)}</Text>
          </View>
        ) : null}

        {pointsApplied && (summary.pointsDiscountAmount ?? 0) > 0 ? (
          <View style={styles.line}>
            <Text style={styles.discountLabel}>পয়েন্ট ছাড় (Loyalty)</Text>
            <Text style={styles.discountValue}>-৳{summary.pointsDiscountAmount?.toFixed(0)}</Text>
          </View>
        ) : null}

        <View style={styles.line}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.label}>ডেলিভারি ফি (Delivery)</Text>
            {summary.distanceKm !== undefined && (
              <Text style={styles.kmBadge}>({summary.distanceKm.toFixed(1)} কিমি)</Text>
            )}
          </View>

          {summary.isLocationPending ? (
            <Text style={styles.pendingFeeText}>নির্দিষ্ট হয়নি</Text>
          ) : summary.isPendingFee ? (
            <Text style={styles.pendingFeeText}>নির্দিষ্ট হয়নি (স্টোর থেকে যাচাই)</Text>
          ) : summary.deliveryCost === 0 && summary.isFreeDelivery ? (
            <Text style={styles.freeText}>
              {summary.loyalty?.milestone?.freeShippingApplied ? 'মাইলস্টোন ফ্রি' : 'ফ্রি (FREE)'}
            </Text>
          ) : (
            <Price amount={summary.deliveryCost} size="sm" />
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.totalLine}>
          <Text style={styles.totalLabel}>সর্বমোট (Grand Total)</Text>
          <Price amount={summary.grandTotal} size="lg" />
        </View>
      </View>

      {/* Points Earned Banner */}
      {!!summary.loyalty?.pointsEarned && summary.loyalty.pointsEarned > 0 && (
        <View style={styles.pointsEarnedBadge}>
          <Text style={{ fontSize: 13 }}>✨</Text>
          <Text style={styles.pointsEarnedText}>
            এই অর্ডারে আপনি পাবেন +{summary.loyalty.pointsEarned} পয়েন্ট!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  milestoneIcon: {
    fontSize: 16,
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  milestoneSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  weightTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  weightSub: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
  },
  pointsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 12,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  pointsCount: {
    fontWeight: '800',
    color: '#0b6234',
  },
  pointsSub: {
    fontSize: 10,
    color: '#64748b',
  },
  pointsBtn: {
    backgroundColor: '#0b6234',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pointsBtnRemove: {
    backgroundColor: '#fee2e2',
  },
  pointsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  pointsBtnTextRemove: {
    color: '#dc2626',
  },
  pointsSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
    marginTop: 6,
  },
  pointsNoticeText: {
    fontSize: 10.5,
    color: '#d97706',
    marginTop: 6,
  },
  couponForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  couponInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
  },
  couponApplyBtn: {
    backgroundColor: '#0b6234',
    paddingHorizontal: 14,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  couponApplyBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  couponApplyBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  appliedCouponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  appliedCouponText: {
    fontSize: 12,
    color: '#15803d',
  },
  removeCouponText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#dc2626',
  },
  couponErrorText: {
    fontSize: 11,
    color: '#dc2626',
    marginBottom: 8,
  },
  breakdown: {
    gap: 8,
    marginTop: 4,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    color: '#4b5563',
  },
  discountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  discountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  kmBadge: {
    fontSize: 11,
    color: '#9ca3af',
  },
  freeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
  },
  pendingFeeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  totalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  pointsEarnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(11, 98, 52, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(11, 98, 52, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  pointsEarnedText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0b6234',
  },
});
