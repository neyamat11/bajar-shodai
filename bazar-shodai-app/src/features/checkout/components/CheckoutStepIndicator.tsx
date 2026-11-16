import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';

interface Step {
  id: number;
  label: string;
  shortLabel: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'ঠিকানা', shortLabel: 'ঠিকানা' },
  { id: 2, label: 'লোকেশন', shortLabel: 'লোকেশন' },
  { id: 3, label: 'পেমেন্ট', shortLabel: 'পেমেন্ট' },
  { id: 4, label: 'রিভিউ', shortLabel: 'রিভিউ' },
];

interface CheckoutStepIndicatorProps {
  currentStep: number;
}

/**
 * 4-Step Checkout Progress Bar for Mobile App.
 * Parity with public site's StepIndicator:
 * Step 1 (Shipping) → Step 2 (Location & Slot) → Step 3 (Payment) → Step 4 (Review)
 */
export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <View style={styles.stepNode}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                  ]}
                >
                  {isCompleted ? (
                    <Icon name="Check" size={14} color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive && styles.stepNumberActive,
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.label,
                    (isCompleted || isActive) && styles.labelActive,
                  ]}
                  numberOfLines={1}
                >
                  {step.shortLabel}
                </Text>
              </View>

              {/* Connecting Line */}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    isCompleted && styles.lineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNode: {
    alignItems: 'center',
    width: 60,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  circleActive: {
    backgroundColor: '#ffffff',
    borderColor: '#0b6234',
  },
  circleCompleted: {
    backgroundColor: '#0b6234',
    borderColor: '#0b6234',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  stepNumberActive: {
    color: '#0b6234',
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  labelActive: {
    color: '#0b6234',
    fontWeight: '700',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 18,
    marginHorizontal: 4,
  },
  lineCompleted: {
    backgroundColor: '#0b6234',
  },
});
