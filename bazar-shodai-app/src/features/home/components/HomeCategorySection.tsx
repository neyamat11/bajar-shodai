import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductGridCard, ProductGridItem } from '@/components/product/ProductGridCard';
import { ProductCardData } from '../types';
import { useCartStore } from '@/store/useCartStore';
import { useQuickViewStore } from '@/store/useQuickViewStore';
import { toast } from '@/store/useToastStore';
import { Icon } from '@/components/ui/Icon';

export interface HomeCategorySectionProps {
  id: string;
  slug: string;
  title: string;
  titleBn?: string | null;
  subtitle?: string | null;
  subtitleBn?: string | null;
  categorySlug?: string | null;
  products: ProductCardData[];
  className?: string;
}

export function HomeCategorySection({
  slug,
  title,
  titleBn,
  subtitle,
  subtitleBn,
  categorySlug,
  products,
  className = '',
}: HomeCategorySectionProps) {
  const router = useRouter();
  const openQuickView = useQuickViewStore((s) => s.openQuickView);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItems = useCartStore((s) => s.items);

  const displayProducts = Array.isArray(products) ? products : [];

  if (displayProducts.length === 0) {
    return null;
  }

  const heading = titleBn || title;
  const subHeading = subtitleBn || subtitle;

  const handleViewAll = () => {
    if (categorySlug) {
      router.push({
        pathname: '/products',
        params: { category: categorySlug },
      });
    } else {
      router.push('/(tabs)/categories');
    }
  };

  return (
    <View className={`px-4 mb-6 ${className}`}>
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-base font-bold text-foreground">{heading}</Text>
          {subHeading ? (
            <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
              {subHeading}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleViewAll}
          activeOpacity={0.7}
          className="flex-row items-center gap-0.5 py-1 px-2 rounded-md bg-brand-fresh/10"
        >
          <Text className="text-xs font-semibold text-brand-deep dark:text-brand-fresh">
            সব দেখুন
          </Text>
          <Icon name="ChevronRight" size={14} color="#0b6234" />
        </TouchableOpacity>
      </View>

      {/* 2-Column Vertical Grid (Strictly matches Mobile Web Responsive Design) */}
      <View className="flex-row flex-wrap justify-between">
        {displayProducts.map((p) => {
          const cartItem = cartItems.find((i) => i.productId === p.id);
          const rawImage =
            p.image ||
            p.imageUrl ||
            (p as any).primaryImage?.url ||
            (p as any).images?.[0]?.url;

          const gridItem: ProductGridItem = {
            id: p.id,
            name: p.name,
            banglaName: p.nameBn ?? undefined,
            slug: p.slug,
            price: Number(p.price),
            originalPrice: p.regularPrice ? Number(p.regularPrice) : undefined,
            imageUrl: rawImage,
            unit: p.unit?.shortLabelBn || p.unit?.shortLabel || 'kg',
            packSize: p.packSize ?? undefined,
            stock: p.stock,
            trackStock: (p as any).trackStock,
            inStock: (p as any).inStock,
            discountPercent: p.discountPercent,
          };

          return (
            <View key={p.id} style={{ width: '48%', marginBottom: 12 }}>
              <ProductGridCard
                product={gridItem}
                quantityInCart={cartItem?.quantity}
                onPress={() => openQuickView(gridItem as any)}
                onAddToCart={() => {
                  addItem(
                    {
                      id: p.id,
                      productId: p.id,
                      name: gridItem.banglaName || gridItem.name,
                      price: gridItem.price,
                      unit: gridItem.unit,
                      imageUrl: gridItem.imageUrl,
                    },
                    p.unit?.minQty ?? 1,
                  );
                  toast.success('Cart', `${gridItem.banglaName || gridItem.name} added`);
                }}
                onQuantityChange={(newQty) => {
                  if (!cartItem) return;
                  if (newQty <= 0) {
                    removeItem(cartItem.id);
                  } else {
                    updateQuantity(cartItem.id, newQty);
                  }
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
