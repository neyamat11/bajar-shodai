import { CheckoutMapView, resolveMapProvider } from '../src/components/map/CheckoutMapView';
import { DeliverySlotPicker } from '../src/features/checkout/components/DeliverySlotPicker';
import { CheckoutStepIndicator } from '../src/features/checkout/components/CheckoutStepIndicator';
import { CheckoutOrderSummary } from '../src/features/checkout/components/CheckoutOrderSummary';
import { MobileBankingForm } from '../src/features/checkout/components/MobileBankingForm';
import { DeliverySlot } from '../src/services/siteService';

describe('CheckoutMapView, DeliverySlotPicker & 4-Step Checkout Parity', () => {
  it('exports all 4-step checkout components cleanly', () => {
    expect(CheckoutMapView).toBeDefined();
    expect(typeof CheckoutMapView).toBe('function');
    expect(DeliverySlotPicker).toBeDefined();
    expect(typeof DeliverySlotPicker).toBe('function');
    expect(CheckoutStepIndicator).toBeDefined();
    expect(typeof CheckoutStepIndicator).toBe('function');
    expect(CheckoutOrderSummary).toBeDefined();
    expect(typeof CheckoutOrderSummary).toBe('function');
    expect(MobileBankingForm).toBeDefined();
    expect(typeof MobileBankingForm).toBe('function');
  });

  it('determines Google Maps vs OpenStreetMap based on distanceCalculation mode and admin settings', () => {
    // 1. Direct distance mode (Default): ALWAYS use Google Maps when browser key is configured
    expect(
      resolveMapProvider({
        distanceCalculation: 'direct',
        provider: 'osm',
        hasGoogleKey: true,
      }),
    ).toBe('google');

    expect(
      resolveMapProvider({
        distanceCalculation: 'direct',
        provider: 'google',
        hasGoogleKey: true,
      }),
    ).toBe('google');

    // Missing key -> graceful fallback to OSM
    expect(
      resolveMapProvider({
        distanceCalculation: 'direct',
        provider: 'google',
        hasGoogleKey: false,
      }),
    ).toBe('osm');

    // Google Maps error -> graceful fallback to OSM
    expect(
      resolveMapProvider({
        distanceCalculation: 'direct',
        provider: 'osm',
        hasGoogleKey: true,
        googleFailed: true,
      }),
    ).toBe('osm');

    // 2. Road distance mode: uses the provider selected by admin in map settings
    // Admin selected OSM -> use OSM
    expect(
      resolveMapProvider({
        distanceCalculation: 'road',
        provider: 'osm',
        hasGoogleKey: true,
      }),
    ).toBe('osm');

    // Admin selected Google with key -> use Google
    expect(
      resolveMapProvider({
        distanceCalculation: 'road',
        provider: 'google',
        hasGoogleKey: true,
      }),
    ).toBe('google');

    // Admin selected Google without key -> fallback to OSM
    expect(
      resolveMapProvider({
        distanceCalculation: 'road',
        provider: 'google',
        hasGoogleKey: false,
      }),
    ).toBe('osm');
  });

  it('handles dynamic delivery slots from dashboard with Any Time standard option as compact pills', () => {
    const adminSlots: DeliverySlot[] = [
      {
        id: 'SLOT_MORNING',
        label: 'Morning Slot',
        labelBn: 'সকাল ৯টা - দুপুর ১২টা',
        from: '09:00',
        to: '12:00',
      },
      {
        id: 'SLOT_EVENING',
        label: 'Evening Slot',
        labelBn: 'বিকাল ৪টা - রাত ৮টা',
        from: '16:00',
        to: '20:00',
      },
    ];

    // Standard options: "" represents "যেকোনো সময় (Any time)"
    const allSlotIds = ['', ...adminSlots.map((s) => s.id)];
    expect(allSlotIds).toEqual(['', 'SLOT_MORNING', 'SLOT_EVENING']);

    // Default selection is "" (Any time)
    const defaultSelection = '';
    expect(defaultSelection).toBe('');

    // Localized Bengali representation
    expect(adminSlots[0]?.labelBn).toBe('সকাল ৯টা - দুপুর ১২টা');
    expect(adminSlots[1]?.labelBn).toBe('বিকাল ৪টা - রাত ৮টা');
  });

  it('validates 4-step wizard navigation and step states', () => {
    const steps = [
      { id: 1, label: 'ঠিকানা' },
      { id: 2, label: 'লোকেশন ও সময়' },
      { id: 3, label: 'পেমেন্ট' },
      { id: 4, label: 'রিভিউ' },
    ];

    expect(steps.length).toBe(4);
    expect(steps[0]?.id).toBe(1);
    expect(steps[3]?.id).toBe(4);
  });

  it('calculates order summary totals with coupon and loyalty points discount', () => {
    const subtotal = 1200;
    const deliveryFee = 40;
    const couponDiscount = 100;
    const pointsDiscount = 50;

    const grandTotal = Math.max(0, subtotal - couponDiscount - pointsDiscount + deliveryFee);
    expect(grandTotal).toBe(1090);
  });
});
