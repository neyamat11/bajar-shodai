import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { Icon } from '@/components/ui/Icon';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { WhatsAppOrderButton } from '@/components/product/WhatsAppOrderButton';
import { MessengerOrderButton } from '@/components/product/MessengerOrderButton';
import { useTranslation } from '@/i18n';

export interface ProductStickyBottomBarProps {
  unitPrice: number;
  quantity: number;
  unit?: string;
  step?: number;
  minQty?: number;
  maxQty?: number;
  inStock?: boolean;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  onNotifyBackInStock?: () => void;
  productName?: string;
  productSlug?: string;
}

export function ProductStickyBottomBar({
  unitPrice,
  quantity,
  unit = 'kg',
  step = 1,
  minQty = 1,
  maxQty,
  inStock = true,
  onQuantityChange,
  onAddToCart,
  onNotifyBackInStock,
  productName,
  productSlug,
}: ProductStickyBottomBarProps) {
  const insets = useSafeAreaInsets();
  const { isBn } = useTranslation();
  const totalPrice = unitPrice * quantity;

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
      className="bg-card border-t border-border"
    >
      <View style={styles.content}>
        {inStock ? (
          <>
            <View style={styles.left}>
              <Text className="text-[10px] text-muted-foreground uppercase font-semibold">
                {isBn ? 'মোট মূল্য' : 'Total Price'}
              </Text>
              <Price amount={totalPrice} size="lg" />
            </View>

            <View style={styles.stepperWrap}>
              <QuantityStepper
                quantity={quantity}
                onQuantityChange={onQuantityChange}
                unit={unit}
                step={step}
                min={minQty}
                max={maxQty ?? 99}
                size="sm"
              />
            </View>

            {/* Icon-Only Add to Bag Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onAddToCart}
              style={styles.addToCartBtn}
              accessibilityRole="button"
              accessibilityLabel={isBn ? 'ব্যাগে যোগ করুন' : 'Add to Bag'}
            >
              <Icon name="ShoppingCart" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Direct Chat Order Buttons (WhatsApp & Messenger Icon Only) */}
            {productName && productSlug ? (
              <>
                <WhatsAppOrderButton
                  variant="icon"
                  productName={productName}
                  productSlug={productSlug}
                  productPrice={unitPrice}
                  style={styles.chatIconBtn}
                />
                <MessengerOrderButton
                  variant="icon"
                  productName={productName}
                  productSlug={productSlug}
                  productPrice={unitPrice}
                  style={styles.chatIconBtn}
                />
              </>
            ) : null}
          </>
        ) : (
          <View className="flex-row items-center justify-between w-full">
            <View>
              <Text className="text-sm font-bold text-destructive">
                {isBn ? 'বর্তমানে স্টক শেষ' : 'Currently Out of Stock'}
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                {isBn ? 'স্টকে আসলে নোটিফিকেশন পান' : 'Get an alert when available'}
              </Text>
            </View>
            <Button
              title={isBn ? 'জানান' : 'Notify Me'}
              variant="outline"
              size="md"
              onPress={onNotifyBackInStock}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingHorizontal: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 44,
  },
  left: {
    marginRight: 4,
  },
  stepperWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0b6234',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0b6234',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chatIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
