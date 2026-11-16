import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '@/components/ui/Icon';
import { PaymentMethod } from '../types';
import { toast } from '@/store/useToastStore';
import { haptics } from '@/services/haptics';
import { useSiteSettings, MobileAccount } from '@/services/siteService';

export interface MobileBankingFormProps {
  method: PaymentMethod;
  senderNumber: string;
  onChangeSenderNumber: (num: string) => void;
  trxId: string;
  onChangeTrxId: (trx: string) => void;
  totalAmount?: number;
}

const BRAND_THEME: Record<PaymentMethod, { name: string; color: string; tint: string; border: string }> = {
  BKASH: { name: 'bKash (বিকাশ)', color: '#e2136e', tint: 'rgba(226, 19, 110, 0.08)', border: '#e2136e' },
  NAGAD: { name: 'Nagad (নগদ)', color: '#f7941d', tint: 'rgba(247, 148, 29, 0.08)', border: '#f7941d' },
  ROCKET: { name: 'Rocket (রকেট)', color: '#8c3494', tint: 'rgba(140, 52, 148, 0.08)', border: '#8c3494' },
  CASH_ON_DELIVERY: { name: 'Cash on Delivery', color: '#0b6234', tint: '#f0fdf4', border: '#0b6234' },
};

/**
 * Dynamic Mobile Banking Form for bKash, Nagad, and Rocket.
 * Directly reads live admin dashboard settings (`settings.payment[method]`):
 * - Displays official account number, type (Personal/Merchant), and store instructions.
 * - One-tap copy account number to clipboard.
 * - Sender mobile number & TrxID input.
 */
export function MobileBankingForm({
  method,
  senderNumber,
  onChangeSenderNumber,
  trxId,
  onChangeTrxId,
  totalAmount,
}: MobileBankingFormProps) {
  if (method === 'CASH_ON_DELIVERY') return null;

  const { data: settings } = useSiteSettings();
  const theme = BRAND_THEME[method] || BRAND_THEME.BKASH;

  // Resolve dynamic account from admin dashboard settings
  const methodKey = method.toLowerCase() as 'bkash' | 'nagad' | 'rocket';
  const account: MobileAccount | null | undefined = settings?.payment?.[methodKey];

  const fallbackNumber = settings?.site?.hotline || settings?.site?.whatsapp || '01624349914';
  const accountNumber = account?.number || fallbackNumber;
  const rawType = (account?.type || 'personal').toLowerCase();
  const accountTypeLabel =
    rawType === 'merchant' ? 'মার্চেন্ট (Merchant)' : rawType === 'agent' ? 'এজেন্ট (Agent)' : 'ব্যক্তিগত (Personal)';

  const handleCopyNumber = async () => {
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(accountNumber);
      }
      haptics.selection();
      toast.success('নম্বর কপি হয়েছে', `${accountNumber} ক্লিপবোর্ডে কপি করা হয়েছে`);
    } catch {
      toast.info('নম্বর', accountNumber);
    }
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Account Card */}
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.tint }]}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Icon name="Smartphone" size={18} color={theme.color} />
            <Text style={[styles.methodTitle, { color: theme.color }]}>{theme.name}</Text>
          </View>
          <View style={[styles.typeBadge, { borderColor: theme.color }]}>
            <Text style={[styles.typeBadgeText, { color: theme.color }]}>{accountTypeLabel}</Text>
          </View>
        </View>

        {/* Account Number & Copy Button */}
        <View style={styles.numberRow}>
          <View>
            <Text style={styles.numberLabel}>টাকা পাঠানোর নম্বর:</Text>
            <Text style={[styles.numberValue, { color: theme.color }]}>{accountNumber}</Text>
          </View>
          <TouchableOpacity
            onPress={handleCopyNumber}
            style={[styles.copyBtn, { backgroundColor: theme.color }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Copy account number"
          >
            <Icon name="Copy" size={14} color="#ffffff" />
            <Text style={styles.copyBtnText}>কপি করুন</Text>
          </TouchableOpacity>
        </View>

        {totalAmount !== undefined && (
          <View style={styles.amountNotice}>
            <Text style={styles.amountNoticeText}>
              পাঠানোর পরিমাণ: <Text style={{ fontWeight: '800' }}>৳{totalAmount.toFixed(0)}</Text>
            </Text>
          </View>
        )}

        {/* Instructions */}
        <Text style={styles.instructionText}>
          ১. আপনার {theme.name.split(' ')[0]} অ্যাপ থেকে {accountTypeLabel.includes('মার্চেন্ট') ? 'Payment' : 'Send Money'} অপশনে যান।{'\n'}
          ২. উপরে দেওয়া নম্বরে সঠিক পরিমাণ টাকা পাঠিয়ে দিন।{'\n'}
          ৩. টাকা পাঠানো সম্পন্ন হলে নিচে প্রেরক নম্বর ও ট্রানজেকশন আইডি দিন:
        </Text>
      </View>

      {/* Inputs */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>যে নম্বর থেকে টাকা পাঠিয়েছেন (Sender Number) *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="যেমন: 017XXXXXXXX অথবা শেষ ৪ ডিজিট"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          value={senderNumber}
          onChangeText={onChangeSenderNumber}
          maxLength={15}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>ট্রানজেকশন আইডি (TrxID) (ঐচ্ছিক / প্রযোজ্য হলে)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="যেমন: 9K72B8XQ"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
          value={trxId}
          onChangeText={(txt) => onChangeTrxId(txt.toUpperCase())}
          maxLength={25}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  numberLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  numberValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  amountNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  amountNoticeText: {
    fontSize: 12,
    color: '#374151',
  },
  instructionText: {
    fontSize: 11.5,
    color: '#4b5563',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#111827',
  },
});
