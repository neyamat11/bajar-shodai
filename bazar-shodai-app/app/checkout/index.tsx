import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Icon } from '@/components/ui/Icon';
import { Price } from '@/components/ui/Price';
import { Button } from '@/components/ui/Button';
import { Radius } from '@/constants/layout';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { CustomerAddress, PaymentMethod } from '@/features/checkout/types';
import { AddressSelector } from '@/features/checkout/components/AddressSelector';
import { CheckoutStepIndicator } from '@/features/checkout/components/CheckoutStepIndicator';
import { PaymentMethodSelector } from '@/features/checkout/components/PaymentMethodSelector';
import { MobileBankingForm } from '@/features/checkout/components/MobileBankingForm';
import { CheckoutOrderSummary, CheckoutSummaryData } from '@/features/checkout/components/CheckoutOrderSummary';
import { CheckoutMapView } from '@/components/map/CheckoutMapView';
import { useSubmitOrder } from '@/features/checkout/api/useSubmitOrder';
import { shareLocationApi } from '@/features/location/api/myLocation';
import {
  acquireLiveLocation,
  KALIBARI_HUB,
  calculateHaversineDistanceKm,
  calculateLocalDeliveryFee,
} from '@/services/location';
import { toast } from '@/store/useToastStore';
import { haptics } from '@/services/haptics';
import { useSiteSettings } from '@/services/siteService';
import { fetchCheckoutSummaryApi, applyCouponApi, CheckoutSummaryResponse } from '@/features/checkout/api/checkoutSummary';

const BD_PHONE_REGEX = /^(\+?88)?01[3-9]\d{8}$/;

/**
 * Mobile Order Checkout — 100% FEATURE & UX PARITY WITH PUBLIC SITE:
 * 1. Step 1: Shipping Details (who & which house, saved addresses, address book)
 * 2. Step 2: Location & Slot (interactive map based on admin settings, GPS locate, skip/abroad, dynamic slot pills)
 * 3. Step 3: Payment (COD / bKash / Nagad / Rocket with live admin accounts, copy button, instructions, sender/TrxID)
 * 4. Step 4: Order Review (full summary breakdown, line-item preview, notes, confirm order)
 * Along with live backend-calculated pricing, coupon apply/remove, and loyalty points redemption.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { items, subtotal, coupon, deliveryCharge, setCoupon } = useCartStore();
  const { data: siteSettings } = useSiteSettings();

  // Wizard Step: 1 = Shipping, 2 = Location & Slot, 3 = Payment, 4 = Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  // Automatically scroll to top whenever checkout step changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // ── Step 1: Shipping Details ──
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Shahrasti');
  const [saveToAddressBook, setSaveToAddressBook] = useState(true);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<CustomerAddress | null>(null);

  // ── Step 2: Location & Preferred Slot ──
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    placeName?: string;
    placeNameBn?: string;
    distanceKm?: number;
    accuracyM?: number;
    originName?: string | null;
    originNameBn?: string | null;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationBlock, setLocationBlock] = useState<string | null>(null);
  const [dynamicDeliveryFee, setDynamicDeliveryFee] = useState<number | null>(null);
  const [skipLocation, setSkipLocation] = useState(false);
  const [isAbroadOrder, setIsAbroadOrder] = useState(false);
  const [senderCountry, setSenderCountry] = useState('');
  const [senderContactMethod, setSenderContactMethod] = useState<'WHATSAPP' | 'IMO' | 'PHONE'>('WHATSAPP');
  const [senderContactNumber, setSenderContactNumber] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('');

  // ── Step 3: Payment Details ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const [senderNumber, setSenderNumber] = useState(user?.phone || '');
  const [trxId, setTrxId] = useState('');

  // ── Step 4: Notes & Live Summary ──
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<string>(coupon?.code || '');
  const [usePoints, setUsePoints] = useState(false);
  const [serverSummary, setServerSummary] = useState<CheckoutSummaryResponse | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const submitOrderMutation = useSubmitOrder();

  // Load saved customer addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['customer-addresses'],
    queryFn: async () => {
      try {
        const res = await api.get<CustomerAddress[]>('/customer/addresses');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Pre-warm Render backend on checkout entry to prevent cold-start delays on location step
  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  // Prefill default saved address
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedSavedAddress) {
      const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      if (def) {
        setSelectedSavedAddress(def);
        setFullName((prev) => prev || def.fullName);
        setPhone((prev) => prev || def.phone);
        setAddressLine((prev) => prev || def.address);
        if (def.latitude && def.longitude && !gpsLocation) {
          setGpsLocation({
            lat: def.latitude,
            lng: def.longitude,
            placeName: def.address,
          });
        }
      }
    }
  }, [savedAddresses, selectedSavedAddress, gpsLocation]);

  // Sync server summary on pin or discount toggle
  const fetchSummary = useCallback(async () => {
    if (items.length === 0) return;
    try {
      setIsSummaryLoading(true);
      const res = await fetchCheckoutSummaryApi({
        couponCode: activeCoupon || undefined,
        lat: skipLocation ? undefined : gpsLocation?.lat,
        lng: skipLocation ? undefined : gpsLocation?.lng,
        phone: phone.trim() || undefined,
        redeemPoints: usePoints ? 999999 : undefined,
        skipLocation,
        isAbroadOrder,
      });
      setServerSummary(res);
      if (res.shipping?.calculatedFee !== undefined) {
        setDynamicDeliveryFee(res.shipping.calculatedFee);
      }
    } catch {
      // Graceful fallback to client calculations
    } finally {
      setIsSummaryLoading(false);
    }
  }, [items.length, activeCoupon, skipLocation, gpsLocation, phone, usePoints, isAbroadOrder]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  // Calculate prices with fallback
  const sub = subtotal();
  const isLocationSelected = !!gpsLocation;
  const isLocationPending = !isLocationSelected && !skipLocation;
  const isPendingFee = skipLocation || serverSummary?.shipping?.isPendingFee || (!isLocationSelected && !serverSummary?.shipping?.available);
  const baseDelivery = dynamicDeliveryFee !== null ? dynamicDeliveryFee : deliveryCharge;
  const currentDelivery = isPendingFee || isLocationPending ? 0 : baseDelivery;
  const effectiveDeliveryCost = (isPendingFee || isLocationPending)
    ? 0
    : (serverSummary?.shippingCost !== undefined ? serverSummary.shippingCost : currentDelivery);

  const siteThreshold = siteSettings?.delivery?.freeDeliveryThreshold ?? null;
  const isThresholdFree = typeof siteThreshold === 'number' && siteThreshold > 0 && sub >= siteThreshold;
  const isFreeDelivery = !isLocationPending && !isPendingFee && effectiveDeliveryCost === 0 && (
    Boolean(serverSummary?.loyalty?.milestone?.freeShippingApplied) ||
    Boolean(isThresholdFree) ||
    (serverSummary?.shipping?.available === true && serverSummary?.shippingCost === 0)
  );
  const couponDiscount = serverSummary?.discountAmount ?? (coupon?.discount ?? 0);
  const pointsDiscount = usePoints ? (serverSummary?.pointsDiscountAmount ?? 0) : 0;
  const grandTotal = isLocationPending || isPendingFee
    ? Math.max(0, sub - couponDiscount - pointsDiscount)
    : (serverSummary?.total ?? Math.max(0, sub - couponDiscount - pointsDiscount + effectiveDeliveryCost));

  const summaryData: CheckoutSummaryData = useMemo(() => ({
    subtotal: serverSummary?.subtotal ?? sub,
    deliveryCost: effectiveDeliveryCost,
    isFreeDelivery,
    distanceKm: serverSummary?.shipping?.distanceKm ?? gpsLocation?.distanceKm,
    isPendingFee,
    isLocationPending,
    isHeavyOrder: serverSummary?.isHeavyOrder,
    heavyOrderReason: serverSummary?.heavyOrderReason,
    coupon: serverSummary?.coupon?.applied ? {
      code: serverSummary.coupon.code,
      discount: serverSummary.coupon.discount,
      description: serverSummary.coupon.description || undefined,
    } : coupon ? {
      code: coupon.code,
      discount: coupon.discount,
    } : null,
    loyalty: serverSummary?.loyalty ? {
      enabled: serverSummary.loyalty.enabled,
      userPoints: serverSummary.loyalty.userPoints,
      pointsRedeemed: serverSummary.loyalty.pointsRedeemed,
      pointsDiscountAmount: serverSummary.loyalty.pointsDiscountAmount,
      pointsEarned: serverSummary.loyalty.pointsEarned,
      canRedeem: serverSummary.loyalty.canRedeem,
      minOrderAmountToRedeem: serverSummary.loyalty.minOrderAmountToRedeem,
      minPointsToRedeem: serverSummary.loyalty.minPointsToRedeem,
      milestone: serverSummary.loyalty.milestone ? {
        freeShippingApplied: serverSummary.loyalty.milestone.freeShippingApplied,
        maxWeightKg: serverSummary.loyalty.milestone.maxWeightKg,
      } : undefined,
      weightExceeded: serverSummary.loyalty.milestone?.weightExceeded,
      orderWeightKg: serverSummary.loyalty.milestone?.orderWeightKg,
    } : null,
    pointsDiscountAmount: pointsDiscount,
    grandTotal,
  }), [serverSummary, sub, effectiveDeliveryCost, isFreeDelivery, isPendingFee, isLocationPending, gpsLocation, skipLocation, coupon, pointsDiscount, grandTotal]);

  // Fast sub-3s GPS detection using native fused provider & optimistic local pinning
  const handleShareLocation = async () => {
    try {
      setIsLocating(true);
      haptics.selection();
      const result = await acquireLiveLocation();

      if (!result.success) {
        haptics.error();
        if (result.error === 'SERVICES_DISABLED') {
          Alert.alert(
            'GPS বন্ধ আছে',
            'আপনার ফোনের লোকেশন / GPS চালু করুন যাতে সঠিক অবস্থান শনাক্ত করা যায়, অথবা লোকেশন সেট ছাড়াই এগিয়ে যান।',
            [
              {
                text: 'লোকেশন সেট ছাড়া এগিয়ে যান',
                onPress: () => {
                  setSkipLocation(true);
                  setCurrentStep(3);
                },
              },
              { text: 'সেটিংস খুলুন', onPress: () => Linking.openSettings() },
              { text: 'বাতিল', style: 'cancel' },
            ],
          );
        } else if (result.error === 'PERMISSION_DENIED') {
          Alert.alert(
            'লোকেশন অনুমতি প্রয়োজন',
            'স্বয়ংক্রিয় অবস্থানের জন্য অ্যাপের লোকেশন পারমিশন দিন, অথবা লোকেশন সেট ছাড়াও অর্ডার সম্পন্ন করতে পারেন।',
            [
              {
                text: 'লোকেশন সেট ছাড়া এগিয়ে যান',
                onPress: () => {
                  setSkipLocation(true);
                  setCurrentStep(3);
                },
              },
              { text: 'সেটিংস খুলুন', onPress: () => Linking.openSettings() },
              { text: 'বাতিল', style: 'cancel' },
            ],
          );
        } else {
          toast.info(
            'সিগন্যাল দুর্বল',
            'ঘরের ভেতরে স্যাটেলাইট সিগন্যাল দুর্বল হতে পারে। নিচের মানচিত্রে পিনটি টেনে আপনার সঠিক বাড়ির উপর বসান।',
          );
        }
        return;
      }

      const coords = result.coords;

      // 1. OPTIMISTIC LOCAL PINNING (Immediate 0ms pin drop & local fee calculation from Kalibari Hub)
      const rawDistKm = calculateHaversineDistanceKm(
        KALIBARI_HUB.latitude,
        KALIBARI_HUB.longitude,
        coords.latitude,
        coords.longitude,
      );
      const isDirectCalc = (siteSettings?.delivery?.distanceCalculation ?? 'direct') === 'direct';
      const routeFactor = isDirectCalc && typeof siteSettings?.delivery?.routeFactor === 'number' && siteSettings.delivery.routeFactor > 0 ? siteSettings.delivery.routeFactor : 1;
      const distKm = Math.round(rawDistKm * routeFactor * 10) / 10;
      const localFee = calculateLocalDeliveryFee(distKm, sub);

      setGpsLocation({
        lat: coords.latitude,
        lng: coords.longitude,
        distanceKm: distKm,
        accuracyM: coords.accuracy ?? undefined,
      });
      setDynamicDeliveryFee(localFee);
      setSkipLocation(false);
      setIsAbroadOrder(false);
      setLocationBlock(null);
      haptics.success();

      // 2. RESILIENT BACKGROUND SERVER SYNC (Never unpins or throws GPS error if server is cold)
      try {
        const res = await shareLocationApi({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracyM: coords.accuracy ?? undefined,
          source: 'GPS',
          phone: phone.trim() || undefined,
          subtotal: sub,
        });

        const blockReason = res.quote?.block;
        if (blockReason === 'OUT_OF_AREA') {
          if (res.quote?.isAbroad) {
            setIsAbroadOrder(true);
            setSkipLocation(true);
            setLocationBlock(null);
            toast.info(
              'আপনি দেশের বাইরে থেকে অর্ডার করছেন!',
              'লোকেশন সেট ছাড়াই অর্ডার সম্পন্ন করতে পারেন। আমাদের টিম সরাসরি আপনার সাথে যোগাযোগ করবে।',
            );
            return;
          }
          setLocationBlock('OUT_OF_AREA');
          toast.error(
            'ডেলিভারি সীমার বাইরে',
            'দুঃখিত, এই এলাকাটি আমাদের ডেলিভারি সীমার বাইরে। আমাদের কেন্দ্র থেকে সর্বোচ্চ ডেলিভারি সীমা অতিক্রম করেছে।',
          );
          return;
        }

        const placeName = res.location?.placeName || res.placeName || res.location?.placeNameBn || res.placeNameBn || '';
        const distance = res.quote?.distanceKm ?? res.distanceKm ?? distKm;

        setGpsLocation((prev) => ({
          lat: coords.latitude,
          lng: coords.longitude,
          placeName: placeName || prev?.placeName,
          placeNameBn: res.location?.placeNameBn || res.placeNameBn,
          distanceKm: distance,
          accuracyM: coords.accuracy ?? undefined,
          originName: res.quote?.originName,
          originNameBn: res.quote?.originNameBn,
        }));

        if (res.quote?.calculatedFee !== undefined) {
          setDynamicDeliveryFee(res.quote.calculatedFee);
        }

        if (!addressLine.trim() && placeName) {
          setAddressLine(placeName);
        }

        toast.success(
          'লোকেশন যুক্ত হয়েছে',
          placeName ? `${placeName} (${distance.toFixed(1)} কিমি)` : `সঠিক অবস্থান যুক্ত হয়েছে (${distance.toFixed(1)} কিমি)`,
        );
      } catch {
        // Render cold start or network delay: Local GPS is securely preserved!
        toast.success(
          'লোকেশন যুক্ত হয়েছে',
          `আপনার বর্তমান অবস্থান পিন করা হয়েছে (${distKm.toFixed(1)} কিমি)`,
        );
      }

      if (result.isCoarse) {
        toast.info(
          'আনুমানিক অবস্থান',
          'আপনার বাড়ির সঠিক অবস্থান নিশ্চিত করতে প্রয়োজনে মানচিত্রে পিনটি কিছুটা সরিয়ে দিন।',
        );
      }
    } catch {
      haptics.error();
      toast.error('লোকেশন ত্রুটি', 'আপনার বর্তমান অবস্থান পাওয়া যায়নি।');
    } finally {
      setIsLocating(false);
    }
  };

  // Handle Map Pin Drag / Click
  const handlePinChange = async (coords: { lat: number; lng: number }) => {
    // Optimistic local distance & fee calculation
    const rawDistKm = calculateHaversineDistanceKm(
      coords.lat,
      coords.lng,
      KALIBARI_HUB.latitude,
      KALIBARI_HUB.longitude
    );
    const isDirectCalc = (siteSettings?.delivery?.distanceCalculation ?? 'direct') === 'direct';
    const routeFactor = isDirectCalc && typeof siteSettings?.delivery?.routeFactor === 'number' && siteSettings.delivery.routeFactor > 0 ? siteSettings.delivery.routeFactor : 1;
    const distKm = Math.round(rawDistKm * routeFactor * 10) / 10;
    const localFee = calculateLocalDeliveryFee(distKm, sub);
    setDynamicDeliveryFee(localFee);
    setGpsLocation({
      lat: coords.lat,
      lng: coords.lng,
      distanceKm: distKm,
      accuracyM: 10,
    });
    setSkipLocation(false);
    setIsAbroadOrder(false);
    setLocationBlock(null);

    try {
      const res = await shareLocationApi({
        lat: coords.lat,
        lng: coords.lng,
        source: 'PIN',
        phone: phone.trim() || undefined,
        subtotal: sub,
      });

      const blockReason = res.quote?.block;
      if (blockReason === 'OUT_OF_AREA') {
        if (res.quote?.isAbroad) {
          setIsAbroadOrder(true);
          setSkipLocation(true);
          setLocationBlock(null);
          return;
        }
        setLocationBlock('OUT_OF_AREA');
        toast.warning(
          'ডেলিভারি সীমার বাইরে',
          'এই অবস্থানটি আমাদের ডেলিভারি সীমার বাইরে। অনুগ্রহ করে সীমার ভেতরে পিন রাখুন।',
        );
        return;
      }

      setLocationBlock(null);
      const placeName = res.location?.placeName || res.placeName || res.location?.placeNameBn || res.placeNameBn || '';
      const distance = res.quote?.distanceKm ?? res.distanceKm ?? distKm;

      setGpsLocation({
        lat: coords.lat,
        lng: coords.lng,
        placeName,
        placeNameBn: res.location?.placeNameBn || res.placeNameBn,
        distanceKm: distance,
        accuracyM: 10,
        originName: res.quote?.originName,
        originNameBn: res.quote?.originNameBn,
      });

      if (res.quote?.calculatedFee !== undefined) {
        setDynamicDeliveryFee(res.quote.calculatedFee);
      }

      haptics.selection();
    } catch {
      // Local calculation already applied and preserved
    }
  };

  // Step 1 Validation & Next
  const handleContinueToLocation = async () => {
    const cleanName = fullName.trim();
    if (cleanName.length < 2) {
      toast.warning('নাম আবশ্যক', 'অনুগ্রহ করে গ্রাহকের পুরো নাম লিখুন');
      return;
    }
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length !== 11 || !BD_PHONE_REGEX.test(cleanPhone)) {
      toast.warning('সঠিক মোবাইল নম্বর দিন', '১১ ডিজিটের সঠিক মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)');
      return;
    }
    if (!addressLine.trim()) {
      toast.warning('ঠিকানা আবশ্যক', 'অনুগ্রহ করে ডেলিভারি ঠিকানা লিখুন');
      return;
    }

    // Save to customer address book if authenticated
    if (isAuthenticated && saveToAddressBook && (!selectedSavedAddress || selectedSavedAddress.address !== addressLine.trim())) {
      try {
        await api.post('/customer/addresses', {
          fullName: cleanName,
          phone: cleanPhone,
          address: addressLine.trim(),
          latitude: gpsLocation?.lat ?? 23.2452,
          longitude: gpsLocation?.lng ?? 90.9422,
          city: city || 'Shahrasti',
          district: 'Chandpur',
          label: 'HOME',
          isDefault: savedAddresses.length === 0,
        });
      } catch {
        // Continue even if address save fails
      }
    }

    haptics.selection();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setCurrentStep(2);
  };

  // Step 2 Validation & Next
  const handleContinueToPayment = () => {
    if (isAbroadOrder) {
      if (!senderContactNumber.trim()) {
        toast.warning('নম্বর আবশ্যক', 'অনুগ্রহ করে কান্ট্রি কোড সহ আপনার হোয়াটসঅ্যাপ/ইমো নম্বর দিন');
        return;
      }
    } else {
      if (!gpsLocation) {
        toast.warning('লোকেশন আবশ্যক', 'আপনার বর্তমান লোকেশন দিন অথবা প্রবাসী হলে বক্সে টিক দিন।');
        return;
      }
      if (locationBlock === 'OUT_OF_AREA') {
        toast.error('ডেলিভারি সীমার বাইরে', 'আপনার নির্বাচিত অবস্থান আমাদের ডেলিভারি সীমার বাইরে।');
        return;
      }
    }

    haptics.selection();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setCurrentStep(3);
  };

  // Step 3 Validation & Next
  const handleContinueToReview = () => {
    if (paymentMethod !== 'CASH_ON_DELIVERY') {
      const cleanSender = senderNumber.trim().replace(/[\s-]/g, '');
      if (!cleanSender || cleanSender.length < 4) {
        toast.warning(
          'প্রেরক নম্বর আবশ্যক',
          'যে নম্বর থেকে টাকা পাঠিয়েছেন তার মোবাইল নম্বর বা শেষ ৪ ডিজিট লিখুন।',
        );
        return;
      }
    }

    haptics.selection();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setCurrentStep(4);
  };

  // Coupon handling
  const handleApplyCoupon = async (code: string) => {
    const res = await applyCouponApi(code, {
      lat: skipLocation ? undefined : gpsLocation?.lat,
      lng: skipLocation ? undefined : gpsLocation?.lng,
      phone: phone.trim() || undefined,
      redeemPoints: usePoints ? 999999 : undefined,
      skipLocation,
      isAbroadOrder,
    });
    setServerSummary(res);
    setActiveCoupon(code);
    if (res.coupon?.applied) {
      setCoupon({ code, discount: res.coupon.discount });
      toast.success('কুপন প্রযোজ্য হয়েছে', `${code} কুপনে ৳${res.coupon.discount} ছাড় পেয়েছেন!`);
    }
  };

  const handleRemoveCoupon = () => {
    setActiveCoupon('');
    setCoupon(null);
    void fetchSummary();
    toast.info('কুপন মুছে ফেলা হয়েছে', 'রেগুলার মূল্য ফিরিয়ে আনা হয়েছে');
  };

  const handleTogglePoints = (apply: boolean) => {
    setUsePoints(apply);
    haptics.selection();
  };

  // Final Order Submission
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.warning('খালি ব্যাগ', 'চেকআউট করার আগে পণ্য ব্যাগে যুক্ত করুন');
      router.replace('/(tabs)/cart');
      return;
    }

    try {
      const order = await submitOrderMutation.mutateAsync({
        paymentMethod,
        shippingAddress: {
          fullName: fullName.trim(),
          phone: phone.trim().replace(/[\s-]/g, ''),
          address: landmark.trim() ? `${addressLine.trim()} (ল্যান্ডমার্ক: ${landmark.trim()})` : addressLine.trim(),
          latitude: gpsLocation?.lat,
          longitude: gpsLocation?.lng,
          city: city || 'Shahrasti',
          district: 'Chandpur',
          locationSource: gpsLocation ? 'GPS' : 'PIN',
        },
        deliverySlot: deliverySlot || undefined,
        deliveryNote: deliveryNotes.trim() || undefined,
        couponCode: activeCoupon || undefined,
        ...(paymentMethod !== 'CASH_ON_DELIVERY' ? {
          bkashSenderNumber: senderNumber.trim(),
          bkashTransactionId: trxId.trim() || undefined,
        } : {}),
        redeemPoints: usePoints ? (serverSummary?.loyalty?.pointsRedeemed || 0) : undefined,
        skipLocation,
        isAbroadOrder,
        senderCountry: isAbroadOrder ? senderCountry.trim() : undefined,
        senderContactMethod: isAbroadOrder ? senderContactMethod : undefined,
        senderContactNumber: isAbroadOrder ? senderContactNumber.trim() : undefined,
      });

      haptics.success();
      toast.success('অর্ডার সম্পন্ন হয়েছে!', `আপনার অর্ডার #${order.orderNumber} সফলভাবে গ্রহণ করা হয়েছে।`);
      router.replace({
        pathname: '/orders/[id]',
        params: { id: order.id, placed: '1' },
      });
    } catch (err: any) {
      haptics.error();
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'অর্ডার সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে আপনার তথ্য যাচাই করে আবার চেষ্টা করুন।';
      toast.error('Order Failed', message);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (currentStep > 1) {
              setCurrentStep((s) => (s - 1) as any);
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="ArrowLeft" size={22} color="#0b6234" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>অর্ডার চেকআউট (Order Checkout)</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Guided 4-Step Checkout Progress Bar */}
      <CheckoutStepIndicator currentStep={currentStep} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Guest Notice Banner */}
          {!isAuthenticated && currentStep === 1 && (
            <View style={styles.guestNoticeCard}>
              <View style={styles.guestNoticeContent}>
                <Icon name="UserCheck" size={18} color="#0b6234" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestNoticeTitle}>গেস্ট চেকআউট (লগইন ঐচ্ছিক)</Text>
                  <Text style={styles.guestNoticeSub}>
                    সংরক্ষিত ঠিকানা ও ডিসকাউন্ট পয়েন্ট পেতে চান?{' '}
                    <Text
                      style={styles.guestNoticeLink}
                      onPress={() => router.push('/(auth)/login?redirect=/checkout')}
                    >
                      লগইন করুন
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 1: SHIPPING DETAILS (১. ঠিকানা)
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderRow}>
                <Icon name="MapPin" size={18} color="#0b6234" />
                <Text style={styles.stepTitle}>ডেলিভারির ঠিকানা (Shipping Address)</Text>
              </View>
              <Text style={styles.stepSubtitle}>
                পণ্য পৌঁছে দেওয়ার জন্য প্রাপকের নাম, মোবাইল নম্বর ও সঠিক ঠিকানা লিখুন।
              </Text>

              {/* Saved Address Selector for Logged In Customer */}
              {isAuthenticated && savedAddresses.length > 0 && (
                <View style={styles.savedSection}>
                  <Text style={styles.fieldLabel}>সংরক্ষিত ঠিকানা থেকে বেছে নিন:</Text>
                  <AddressSelector
                    selectedAddress={selectedSavedAddress}
                    onSelectAddress={(addr) => {
                      setSelectedSavedAddress(addr);
                      setFullName(addr.fullName);
                      setPhone(addr.phone);
                      setAddressLine(addr.address);
                      if (addr.latitude && addr.longitude) {
                        setGpsLocation({
                          lat: addr.latitude,
                          lng: addr.longitude,
                          placeName: addr.address,
                        });
                      }
                    }}
                  />
                  <View style={styles.divider} />
                </View>
              )}

              {/* Recipient Form Fields */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>আপনার নাম (Full Name) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="যেমন: তানভির আহমেদ"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>মোবাইল নম্বর (Phone Number) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="017XXXXXXXX"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  maxLength={11}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>বিস্তারিত ঠিকানা (House, Road, Area) *</Text>
                <TextInput
                  style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }]}
                  placeholder="যেমন: বাড়ি ১২, রোড ৪, কালীবাড়ী বাজার, শাহরাস্তি..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={2}
                  value={addressLine}
                  onChangeText={setAddressLine}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>কাছের ল্যান্ডমার্ক / পরিচিত স্থান (ঐচ্ছিক)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="যেমন: কালীবাড়ী হাই স্কুল মাঠ সংলগ্ন"
                  placeholderTextColor="#9ca3af"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>

              {isAuthenticated && (
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setSaveToAddressBook(!saveToAddressBook)}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={saveToAddressBook ? 'CheckSquare' : 'Square'}
                    size={18}
                    color="#0b6234"
                  />
                  <Text style={styles.checkboxText}>
                    ভবিষ্যৎ অর্ডারের জন্য ঠিকানাটি আমার প্রোফাইলে সংরক্ষণ করুন
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 2: DELIVERY LOCATION (২. ডেলিভারি লোকেশন)
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderRow}>
                <Icon name="Navigation" size={18} color="#0b6234" />
                <Text style={styles.stepTitle}>ডেলিভারি লোকেশন (Delivery Location)</Text>
              </View>
              <Text style={styles.stepSubtitle}>
                ম্যাপে আপনার সঠিক বাড়ি নির্বাচন করুন যাতে লাইভ দূরত্বের ভিত্তিতে সঠিক ডেলিভারি চার্জ নির্ধারিত হয়।
              </Text>

              {/* Interactive Map View */}
              <View style={styles.mapContainer}>
                <CheckoutMapView
                  marker={gpsLocation ? { lat: gpsLocation.lat, lng: gpsLocation.lng } : null}
                  onMarkerChange={handlePinChange}
                  height={220}
                />
              </View>

              {/* GPS Locate Button */}
              <TouchableOpacity
                style={[
                  styles.gpsBtn,
                  gpsLocation && styles.gpsBtnActive,
                  isLocating && styles.gpsBtnLoading,
                ]}
                onPress={handleShareLocation}
                disabled={isLocating}
                activeOpacity={0.8}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#0b6234" />
                ) : (
                  <Icon name="Crosshair" size={20} color="#0b6234" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.gpsBtnTitle}>
                    {isLocating
                      ? 'আপনার অবস্থান অনুসন্ধান করা হচ্ছে...'
                      : gpsLocation
                        ? '✓ বর্তমান অবস্থান যুক্ত হয়েছে (GPS)'
                        : 'আমার বর্তমান লোকেশন দিন'}
                  </Text>
                  <Text style={styles.gpsBtnSub}>
                    {gpsLocation
                      ? `${gpsLocation.placeName || 'শাহরাস্তি'} • ${(gpsLocation.originNameBn || gpsLocation.originName || serverSummary?.shipping?.originNameBn || serverSummary?.shipping?.originName || 'দোকান')} থেকে ${gpsLocation.distanceKm !== undefined ? gpsLocation.distanceKm.toFixed(1) : '0'} কিমি`
                      : 'ডেলিভারি চার্জ ও সঠিক অবস্থান নিশ্চিত করতে প্রেস করুন'}
                  </Text>
                </View>
                <Icon
                  name={gpsLocation ? 'Check' : 'ChevronRight'}
                  size={18}
                  color={gpsLocation ? '#0b6234' : '#9ca3af'}
                />
              </TouchableOpacity>

              {/* Out of Area Alert */}
              {locationBlock === 'OUT_OF_AREA' && (
                <View style={styles.outOfAreaAlert}>
                  <Icon name="AlertTriangle" size={18} color="#dc2626" />
                  <Text style={styles.outOfAreaAlertText}>
                    দুঃখিত, এই এলাকাটি আমাদের ডেলিভারি সীমার বাইরে। আমাদের কেন্দ্র থেকে সর্বোচ্চ ডেলিভারি সীমা অতিক্রম করেছে।
                  </Text>
                </View>
              )}

              {/* Clean Abroad Order Checkbox */}
              <View style={styles.abroadCard}>
                <TouchableOpacity
                  style={styles.abroadCheckboxRow}
                  onPress={() => {
                    const next = !isAbroadOrder;
                    setIsAbroadOrder(next);
                    setSkipLocation(next);
                    haptics.selection();
                  }}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={isAbroadOrder ? 'CheckSquare' : 'Square'}
                    size={20}
                    color="#0b6234"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.abroadCheckboxTitle}>
                      আমি দেশের বাইরে (প্রবাসী) থেকে অর্ডার করছি
                    </Text>
                    <Text style={styles.abroadCheckboxSub}>
                      {isAbroadOrder
                        ? 'লোকেশন সেট লাগবে না • ডেলিভারি ফি স্টোর থেকে যাচাই করা হবে (৳—)'
                        : 'প্রবাসী হলে টিক দিন, লোকেশন সেট ছাড়াই অর্ডার সম্পন্ন করতে পারবেন'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isAbroadOrder && (
                  <View style={styles.abroadFields}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>আপনার বর্তমান দেশ (ঐচ্ছিক)</Text>
                      <TextInput
                        style={styles.input}
                        value={senderCountry}
                        onChangeText={setSenderCountry}
                        placeholder="যেমন: সৌদি আরব, দুবাই, কাতার, মালয়েশিয়া (ঐচ্ছিক)"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>যোগাযোগের মাধ্যম *</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                        <TouchableOpacity
                          style={[
                            styles.platformPill,
                            senderContactMethod === 'WHATSAPP' && styles.platformPillActive,
                          ]}
                          onPress={() => setSenderContactMethod('WHATSAPP')}
                        >
                          <Text
                            style={[
                              styles.platformPillText,
                              senderContactMethod === 'WHATSAPP' && styles.platformPillTextActive,
                            ]}
                          >
                            WhatsApp
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.platformPill,
                            senderContactMethod === 'IMO' && styles.platformPillActive,
                          ]}
                          onPress={() => setSenderContactMethod('IMO')}
                        >
                          <Text
                            style={[
                              styles.platformPillText,
                              senderContactMethod === 'IMO' && styles.platformPillTextActive,
                            ]}
                          >
                            IMO
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        {senderContactMethod === 'IMO' ? 'ইমো' : 'হোয়াটসঅ্যাপ'} নম্বর (কান্ট্রি কোড সহ) *
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={senderContactNumber}
                        onChangeText={setSenderContactNumber}
                        placeholder="+966 50 123 4567"
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 3: PAYMENT METHOD (৩. পেমেন্ট)
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <PaymentMethodSelector
                selectedMethod={paymentMethod}
                onSelectMethod={setPaymentMethod}
              />

              {/* Dynamic Mobile Banking Details with Store Accounts */}
              <MobileBankingForm
                method={paymentMethod}
                senderNumber={senderNumber}
                onChangeSenderNumber={setSenderNumber}
                trxId={trxId}
                onChangeTrxId={setTrxId}
                totalAmount={grandTotal}
              />
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 4: ORDER REVIEW & CONFIRMATION (৪. রিভিউ)
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderRow}>
                <Icon name="CheckCircle" size={18} color="#0b6234" />
                <Text style={styles.stepTitle}>অর্ডার যাচাই ও নিশ্চিতকরণ (Review & Confirm)</Text>
              </View>
              <Text style={styles.stepSubtitle}>
                অর্ডার নিশ্চিত করার আগে আপনার তথ্য ও আইটেমসমূহ ভালো করে যাচাই করে নিন।
              </Text>

              {/* Review Card: Shipping Address */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Icon name="MapPin" size={15} color="#0b6234" />
                  <Text style={styles.reviewCardTitle}>ডেলিভারির ঠিকানা ও প্রাপক</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(1)}>
                    <Text style={styles.reviewEditLink}>পরিবর্তন</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewTextBold}>{fullName} • {phone}</Text>
                <Text style={styles.reviewTextSub}>{addressLine}</Text>
                {landmark.trim() ? (
                  <Text style={styles.reviewTextMuted}>ল্যান্ডমার্ক: {landmark}</Text>
                ) : null}
                <Text style={styles.reviewBadgeText}>
                  {skipLocation
                    ? (isAbroadOrder ? '🌐 প্রবাসী অর্ডার (লোকেশন সেট ছাড়া)' : '🌐 লোকেশন সেট ছাড়া অর্ডার')
                    : gpsLocation?.placeName
                      ? `📍 ${gpsLocation.placeName} (${(gpsLocation.originNameBn || gpsLocation.originName || serverSummary?.shipping?.originNameBn || serverSummary?.shipping?.originName) ? `${gpsLocation.originNameBn || gpsLocation.originName || serverSummary?.shipping?.originNameBn || serverSummary?.shipping?.originName} থেকে ` : ''}${gpsLocation.distanceKm !== undefined ? gpsLocation.distanceKm.toFixed(1) : ''} কিমি)`
                      : '📍 ম্যাপ পিন যুক্ত হয়েছে'}
                </Text>
              </View>

              {/* Review Card: Payment Method */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Icon name="CreditCard" size={15} color="#0b6234" />
                  <Text style={styles.reviewCardTitle}>পেমেন্ট মাধ্যম</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(3)}>
                    <Text style={styles.reviewEditLink}>পরিবর্তন</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewTextBold}>
                  {paymentMethod === 'CASH_ON_DELIVERY'
                    ? 'ক্যাশ অন ডেলিভারি (Cash on Delivery)'
                    : `${paymentMethod} (প্রেরক: ${senderNumber}${trxId ? `, TrxID: ${trxId}` : ''})`}
                </Text>
              </View>

              {/* Review Card: Cart Items Preview */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Icon name="ShoppingBag" size={15} color="#0b6234" />
                  <Text style={styles.reviewCardTitle}>অর্ডার আইটেম ({items.length}টি)</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/cart')}>
                    <Text style={styles.reviewEditLink}>ব্যাগ এডিট</Text>
                  </TouchableOpacity>
                </View>

                {items.map((it) => (
                  <View key={it.productId} style={styles.itemRow}>
                    {it.imageUrl ? (
                      <Image source={{ uri: it.imageUrl }} style={styles.itemThumb} />
                    ) : (
                      <View style={styles.itemThumbPlaceholder}>
                        <Icon name="ShoppingBag" size={16} color="#9ca3af" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                      <Text style={styles.itemQty}>
                        {it.quantity} {it.unit || 'টি'} × ৳{it.price}
                      </Text>
                    </View>
                    <Price amount={it.price * it.quantity} size="sm" />
                  </View>
                ))}
              </View>

              {/* Delivery Notes Input */}
              <View style={styles.notesBox}>
                <Text style={styles.fieldLabel}>ডেলিভারি নোট বা বিশেষ নির্দেশনা (ঐচ্ছিক)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="যেমন: কলিংবেল নষ্ট, এসে ফোন দিবেন..."
                  placeholderTextColor="#9ca3af"
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                />
              </View>
            </View>
          )}

          {/* Integrated Dynamic Order Summary (Available across all steps) */}
          <CheckoutOrderSummary
            summary={summaryData}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            onTogglePoints={handleTogglePoints}
            pointsApplied={usePoints}
            couponLoading={isSummaryLoading}
          />
        </ScrollView>

        {/* Sticky Confirm Order Footer on Mobile */}
        <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.footerPriceCol}>
            <Text style={styles.footerPriceLabel}>সর্বমোট মূল্য (Total)</Text>
            <Price amount={grandTotal} size="lg" />
          </View>

          <View style={styles.footerActionRow}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.footerBackBtn}
                onPress={() => {
                  haptics.selection();
                  setCurrentStep((s) => (s - 1) as any);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="পূর্ববর্তী ধাপে যান"
              >
                <Icon name="ArrowLeft" size={15} color="#374151" />
                <Text style={styles.footerBackBtnText}>পূর্ববর্তী</Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }}>
              {currentStep === 1 && (
                <Button
                  title="এগিয়ে যান"
                  variant="primary"
                  size="md"
                  onPress={handleContinueToLocation}
                  rightIcon={<Icon name="ArrowRight" size={16} color="#ffffff" />}
                />
              )}
              {currentStep === 2 && (
                <Button
                  title="পেমেন্টে যান"
                  variant="primary"
                  size="md"
                  onPress={handleContinueToPayment}
                  rightIcon={<Icon name="ArrowRight" size={16} color="#ffffff" />}
                />
              )}
              {currentStep === 3 && (
                <Button
                  title="রিভিউতে যান"
                  variant="primary"
                  size="md"
                  onPress={handleContinueToReview}
                  rightIcon={<Icon name="ArrowRight" size={16} color="#ffffff" />}
                />
              )}
              {currentStep === 4 && (
                <Button
                  title="অর্ডার নিশ্চিত করুন"
                  variant="primary"
                  size="md"
                  onPress={handlePlaceOrder}
                  loading={submitOrderMutation.isPending}
                  disabled={submitOrderMutation.isPending}
                  rightIcon={<Icon name="ArrowRight" size={16} color="#ffffff" />}
                />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  guestNoticeCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  guestNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  guestNoticeSub: {
    fontSize: 11.5,
    color: '#15803d',
    marginTop: 2,
  },
  guestNoticeLink: {
    fontWeight: '800',
    color: '#0b6234',
    textDecorationLine: 'underline',
  },
  stepContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 17,
  },
  savedSection: {
    marginBottom: 10,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#0f172a',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  checkboxText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  gpsBtnActive: {
    borderColor: '#0b6234',
    backgroundColor: '#f0fdf4',
  },
  gpsBtnLoading: {
    opacity: 0.8,
  },
  gpsBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b6234',
  },
  gpsBtnSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  outOfAreaAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  outOfAreaAlertText: {
    fontSize: 11.5,
    color: '#dc2626',
    flex: 1,
  },
  abroadCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  abroadCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  abroadCheckboxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  abroadCheckboxSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  abroadFields: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  platformPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  platformPillActive: {
    borderColor: '#0b6234',
    backgroundColor: 'rgba(11, 98, 52, 0.08)',
  },
  platformPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  platformPillTextActive: {
    color: '#0b6234',
    fontWeight: '800',
  },
  reviewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reviewCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  reviewEditLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0b6234',
    textDecorationLine: 'underline',
  },
  reviewTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewTextSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  reviewTextMuted: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0b6234',
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  itemThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemQty: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  notesBox: {
    marginTop: 4,
    marginBottom: 10,
  },
  notesInput: {
    height: 42,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 12.5,
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  footerPriceCol: {
    minWidth: 80,
  },
  footerPriceLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  footerActionRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  footerBackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
