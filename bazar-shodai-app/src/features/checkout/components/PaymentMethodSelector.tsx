import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Radius } from '@/constants/layout';
import { PaymentMethod } from '../types';
import { haptics } from '@/services/haptics';
import { useSiteSettings } from '@/services/siteService';

export interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  availableMethods?: PaymentMethod[];
}

interface MethodOption {
  id: PaymentMethod;
  name: string;
  subtitle: string;
  icon: string;
  badge?: string;
  themeColor: string;
  bgColor: string;
}

const ALL_METHODS: MethodOption[] = [
  {
    id: 'CASH_ON_DELIVERY',
    name: 'Cash on Delivery (ক্যাশ অন ডেলিভারি)',
    subtitle: 'পণ্য হাতে পেয়ে নগদ টাকা পরিশোধ করুন',
    icon: 'Banknote',
    badge: 'POPULAR',
    themeColor: '#0b6234',
    bgColor: '#f0fdf4',
  },
  {
    id: 'BKASH',
    name: 'bKash (বিকাশ)',
    subtitle: 'অফিসিয়াল বিকাশ নম্বরে পেমেন্ট / সেন্ড মানি করুন',
    icon: 'Smartphone',
    themeColor: '#e2136e',
    bgColor: '#fdf2f8',
  },
  {
    id: 'NAGAD',
    name: 'Nagad (নগদ)',
    subtitle: 'অফিসিয়াল নগদ নম্বরে পেমেন্ট / সেন্ড মানি করুন',
    icon: 'Smartphone',
    themeColor: '#f7941d',
    bgColor: '#fff7ed',
  },
  {
    id: 'ROCKET',
    name: 'Rocket (রকেট)',
    subtitle: 'ডাচ্-বাংলা ব্যাংক রকেট ট্রান্সফার',
    icon: 'Smartphone',
    themeColor: '#8c3494',
    bgColor: '#faf5ff',
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  availableMethods,
}: PaymentMethodSelectorProps) {
  const { data: settings } = useSiteSettings();

  const activeMethodsList = availableMethods || (settings?.payment?.methods as PaymentMethod[]) || [
    'CASH_ON_DELIVERY',
    'BKASH',
    'NAGAD',
    'ROCKET',
  ];

  const visibleMethods = ALL_METHODS.filter((m) =>
    activeMethodsList.includes(m.id) ||
    activeMethodsList.includes(m.id.toUpperCase() as any)
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Icon name="CreditCard" size={18} color="#0b6234" />
        <Text style={styles.sectionTitle}>পেমেন্ট মাধ্যম বেছে নিন (Payment Method)</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        পণ্য পাওয়ার পর নগদ টাকায় পরিশোধ করুন অথবা মোবাইল ব্যাংকিং ব্যবহার করুন।
      </Text>

      <View style={styles.list}>
        {visibleMethods.map((method) => {
          const isSelected = selectedMethod === method.id;

          return (
            <TouchableOpacity
              key={method.id}
              onPress={() => {
                haptics.selection();
                onSelectMethod(method.id);
              }}
              style={[
                styles.methodCard,
                isSelected && {
                  borderColor: method.themeColor,
                  backgroundColor: method.bgColor,
                },
              ]}
              activeOpacity={0.8}
            >
              {/* Left: Brand Icon Box */}
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isSelected ? '#ffffff' : method.bgColor,
                    borderColor: isSelected ? method.themeColor : '#e2e8f0',
                  },
                ]}
              >
                <Icon
                  name={method.id === 'CASH_ON_DELIVERY' ? 'Banknote' : 'Smartphone'}
                  size={20}
                  color={method.themeColor}
                />
              </View>

              {/* Middle: Method Info */}
              <View style={styles.methodInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.methodName,
                      isSelected && { color: method.themeColor },
                    ]}
                    numberOfLines={1}
                  >
                    {method.name}
                  </Text>
                  {method.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{method.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.methodSubtitle} numberOfLines={2}>
                  {method.subtitle}
                </Text>
              </View>

              {/* Right: Radio Indicator */}
              <View
                style={[
                  styles.radioCircle,
                  isSelected && {
                    borderColor: method.themeColor,
                    backgroundColor: '#ffffff',
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioDot,
                      { backgroundColor: method.themeColor },
                    ]}
                  />
                )}
              </View>
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
  titleRow: {
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
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  list: {
    gap: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#86efac',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  methodSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 15,
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
  },
});
