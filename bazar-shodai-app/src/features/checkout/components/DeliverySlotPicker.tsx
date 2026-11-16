import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Radius } from '@/constants/layout';
import { haptics } from '@/services/haptics';
import { useSiteSettings, DeliverySlot } from '@/services/siteService';

export interface DeliverySlotPickerProps {
  selectedSlot: string;
  onSelectSlot: (slotId: string) => void;
  deliveryNotes: string;
  onChangeDeliveryNotes: (notes: string) => void;
  slots?: DeliverySlot[];
}

/**
 * Delivery Slot Picker.
 * Directly mirrors the public storefront implementation:
 * - Dynamically loads admin-configured delivery slots from `/customer/settings` (`delivery.slots`).
 * - Features "যেকোনো সময় (Any time)" as standard default option.
 * - Updates smoothly whenever admin modifies delivery slot windows in the dashboard.
 */
export function DeliverySlotPicker({
  selectedSlot,
  onSelectSlot,
  deliveryNotes,
  onChangeDeliveryNotes,
  slots: propSlots,
}: DeliverySlotPickerProps) {
  const { data: settings } = useSiteSettings();
  const remoteSlots = settings?.delivery?.slots;
  const activeSlots = (propSlots || remoteSlots || []).filter(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Icon name="Clock" size={18} color="#0b6234" />
        <Text style={styles.sectionTitle}>পছন্দের ডেলিভারি সময় (Preferred Delivery Slot)</Text>
      </View>
      <Text style={styles.sectionLead}>
        আপনার সুবিধাজনক ডেলিভারি সময় বেছে নিন অথবা যেকোনো সময় দ্রুততম ডেলিভারি গ্রহণ করুন।
      </Text>

      {/* Slots List */}
      <View style={styles.slotsGroup}>
        {/* Default 'Any time' Option - identical to public site */}
        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            onSelectSlot('');
          }}
          style={[styles.slotCard, selectedSlot === '' && styles.slotCardActive]}
          activeOpacity={0.8}
        >
          <View style={styles.radioCircle}>
            {selectedSlot === '' && <View style={styles.radioDot} />}
          </View>

          <View style={styles.slotTextCol}>
            <View style={styles.slotLabelRow}>
              <Text style={[styles.slotLabel, selectedSlot === '' && styles.slotLabelActive]}>
                যেকোনো সময় (Any time)
              </Text>
              <View style={styles.expressBadge}>
                <Icon name="Zap" size={10} color="#0b6234" />
                <Text style={styles.expressText}>দ্রুততম</Text>
              </View>
            </View>
            <Text style={styles.slotSubtitle}>
              অর্ডার প্রস্তুত হওয়ামাত্র দ্রুত পৌঁছে যাবে আপনার ঠিকানায়
            </Text>
          </View>
        </TouchableOpacity>

        {/* Dynamic Admin-configured Delivery Slots */}
        {activeSlots.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          const displayTitle = slot.labelBn || slot.label;
          const timeWindow = slot.from && slot.to ? `${slot.from} - ${slot.to}` : '';

          return (
            <TouchableOpacity
              key={slot.id}
              onPress={() => {
                haptics.selection();
                onSelectSlot(slot.id);
              }}
              style={[styles.slotCard, isSelected && styles.slotCardActive]}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                {isSelected && <View style={styles.radioDot} />}
              </View>

              <View style={styles.slotTextCol}>
                <View style={styles.slotLabelRow}>
                  <Text style={[styles.slotLabel, isSelected && styles.slotLabelActive]}>
                    {displayTitle}
                  </Text>
                </View>
                <Text style={styles.slotSubtitle}>
                  {slot.label} {timeWindow ? `• ${timeWindow}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Instructions Textarea */}
      <View style={styles.notesGroup}>
        <Text style={styles.notesLabel}>ডেলিভারি নির্দেশনা (Delivery Instructions - Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="যেমন: আসার আগে কল দিন, দারোয়ানের কাছে রাখুন, ৩য় তলা..."
          placeholderTextColor="#9ca3af"
          value={deliveryNotes}
          onChangeText={onChangeDeliveryNotes}
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionLead: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  slotsGroup: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.brand,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  slotCardActive: {
    borderColor: '#0b6234',
    backgroundColor: '#f0fdf4',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0b6234',
  },
  slotTextCol: {
    flex: 1,
  },
  slotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  slotLabelActive: {
    color: '#0b6234',
    fontWeight: '700',
  },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0b6234',
  },
  slotSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  notesGroup: {
    marginTop: 14,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: Radius.brand,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
