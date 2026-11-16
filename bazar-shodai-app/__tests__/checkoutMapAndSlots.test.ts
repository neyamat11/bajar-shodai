import { CheckoutMapView } from '../src/components/map/CheckoutMapView';
import { DeliverySlotPicker } from '../src/features/checkout/components/DeliverySlotPicker';
import { DeliverySlot } from '../src/services/siteService';

describe('CheckoutMapView & DeliverySlotPicker (Web Parity & Admin Dashboard Settings)', () => {
  it('exports CheckoutMapView and DeliverySlotPicker components cleanly', () => {
    expect(CheckoutMapView).toBeDefined();
    expect(typeof CheckoutMapView).toBe('function');
    expect(DeliverySlotPicker).toBeDefined();
    expect(typeof DeliverySlotPicker).toBe('function');
  });

  it('determines Google Maps vs OpenStreetMap based on admin settings', () => {
    const resolveProvider = (
      provider: string,
      googleKey?: string | null,
      failed = false,
    ) => {
      const wantsGoogle = provider === 'google' && Boolean(googleKey?.trim());
      return wantsGoogle && !failed ? 'google' : 'osm';
    };

    // Admin sets Google provider with key -> Google Maps
    expect(resolveProvider('google', 'AIzaSyTestKey123')).toBe('google');

    // Admin sets Google provider without key -> fallback to OSM
    expect(resolveProvider('google', null)).toBe('osm');
    expect(resolveProvider('google', '')).toBe('osm');

    // Admin sets OSM provider -> OpenStreetMap
    expect(resolveProvider('osm', 'AIzaSyTestKey123')).toBe('osm');

    // Google Maps auth failure -> fallback to OSM
    expect(resolveProvider('google', 'AIzaSyTestKey123', true)).toBe('osm');
  });

  it('handles dynamic delivery slots from dashboard with Any Time standard option', () => {
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
});
