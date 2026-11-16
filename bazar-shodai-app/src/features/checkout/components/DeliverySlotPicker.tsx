import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/services/haptics';
import { useSiteSettings, DeliverySlot } from '@/services/siteService';

export interface DeliverySlotPickerProps {
  selectedSlot: string;
  onSelectSlot: (slotId: string) => void;
  slots?: DeliverySlot[];
}

/**
 * Delivery Slot Picker — EXACT PARITY with public site's LocationStep:
 * Renders compact horizontal flex-wrap pill buttons:
 * 1. "যেকোনো সময় (Any time)" (Default)
 * 2. Admin dashboard-configured slots (`delivery.slots`)
 */
export function DeliverySlotPicker({
  selectedSlot,
  onSelectSlot,
  slots: propSlots,
}: DeliverySlotPickerProps) {
  const { data: settings } = useSiteSettings();
  const remoteSlots = settings?.delivery?.slots;
  const activeSlots = (propSlots || remoteSlots || []).filter(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Icon name="Clock" size={16} color="#0b6234" />
        <Text style={styles.sectionTitle}>পছন্দের ডেলিভারি সময় (Preferred Delivery Slot)</Text>
      </View>
      <Text style={styles.sectionLead}>
        আপনার সুবিধাজনক সময় বেছে নিন অথবা যেকোনো সময় দ্রুততম ডেলিভারি গ্রহণ করুন।
      </Text>

      {/* Exact Public Site Matching Flex-Wrap Pills */}
      <View style={styles.pillsWrap}>
        {/* Default 'Any time' Option */}
        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            onSelectSlot('');
          }}
          style={[styles.pill, selectedSlot === '' && styles.pillActive]}
          activeOpacity={0.8}
        >
          {selectedSlot === '' && <Icon name="Check" size={13} color="#0b6234" style={{ marginRight: 4 }} />}
          <Text style={[styles.pillText, selectedSlot === '' && styles.pillTextActive]}>
            যেকোনো সময় (Any time)
          </Text>
        </TouchableOpacity>

        {/* Dynamic Admin-configured Delivery Slots */}
        {activeSlots.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          const displayTitle = slot.labelBn || slot.label;

          return (
            <TouchableOpacity
              key={slot.id}
              onPress={() => {
                haptics.selection();
                onSelectSlot(slot.id);
              }}
              style={[styles.pill, isSelected && styles.pillActive]}
              activeOpacity={0.8}
            >
              {isSelected && <Icon name="Check" size={13} color="#0b6234" style={{ marginRight: 4 }} />}
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {displayTitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  sectionLead: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  pillActive: {
    borderColor: '#0b6234',
    backgroundColor: 'rgba(11, 98, 52, 0.08)',
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4b5563',
  },
  pillTextActive: {
    color: '#0b6234',
    fontWeight: '800',
  },
});
