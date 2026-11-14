import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ProductGridCard, ProductGridItem } from '@/components/product/ProductGridCard';
import { useCartStore } from '@/store/useCartStore';
import { useQuickViewStore } from '@/store/useQuickViewStore';
import { toast } from '@/store/useToastStore';
import { useTranslation } from '@/i18n';

export interface RelatedProductsProps {
  products?: ProductGridItem[];
  title?: string;
  subtitle?: string;
}

export function RelatedProducts({
  products = [],
  title,
  subtitle,
}: RelatedProductsProps) {
  const { isBn } = useTranslation();
  const openQuickView = useQuickViewStore((s) => s.openQuickView);
  const { items, addItem, updateQuantity, removeItem } = useCartStore();

  if (!products || products.length === 0) {
    return null;
  }

  const displayTitle = title || (isBn ? 'একসাথে কেনা হয়' : 'Frequently Bought Together');
  const displaySubtitle = subtitle || (isBn ? 'ক্রেতারা আরও যা কিনছেন' : 'Customers also bought');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.subtitle}>{displaySubtitle}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((item) => {
          const cartItem = items.find((ci) => ci.productId === item.id);
          const quantityInCart = cartItem ? cartItem.quantity : 0;

          return (
            <View key={item.id} style={styles.cardWrapper}>
              <ProductGridCard
                product={item}
                quantityInCart={quantityInCart}
                onPress={() => openQuickView(item as any)}
                onAddToCart={() => {
                  addItem(
                    {
                      id: item.id,
                      productId: item.id,
                      name: item.name,
                      price: item.price,
                      originalPrice: item.originalPrice,
                      imageUrl: item.imageUrl,
                      unit: item.unit,
                      stock: item.stock,
                    },
                    1,
                  );
                  toast.success('Added to Bag', `${item.name} added`);
                }}
                onQuantityChange={(newQty) => {
                  if (newQty <= 0) {
                    removeItem(item.id);
                  } else {
                    updateQuantity(item.id, newQty);
                  }
                }}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 6,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    width: 160,
  },
});
