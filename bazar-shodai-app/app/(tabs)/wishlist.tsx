import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Radius } from '@/constants/layout';
import { useWishlist, useToggleWishlist } from '@/features/account/api/accountApi';
import { useCartStore } from '@/store/useCartStore';
import { useQuickViewStore } from '@/store/useQuickViewStore';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { haptics } from '@/services/haptics';
import { WishlistItem } from '@/features/account/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

export default function WishlistScreen() {
  const router = useRouter();
  const openQuickView = useQuickViewStore((s) => s.openQuickView);
  const { isAuthenticated } = useAuthStore();
  const { data: wishlist = [], isLoading, refetch, isRefetching } = useWishlist();
  const { mutate: toggleWishlist } = useToggleWishlist();
  const addItem = useCartStore((s) => s.addItem);

  const handleRemove = (productId: string) => {
    haptics.light();
    toggleWishlist(
      { productId, inWishlist: true },
      {
        onSuccess: () => {
          toast.info('Removed', 'Item removed from your wishlist');
        },
      },
    );
  };

  const handleMoveToCart = (item: WishlistItem) => {
    haptics.success();
    const p = item.product || item;
    const pid = item.productId || p.id || item.id;
    addItem({
      id: pid,
      productId: pid,
      name: p.name || (item as any).name,
      banglaName: p.nameBn || (item as any).nameBn,
      price: p.salePrice ?? p.price ?? (item as any).price,
      originalPrice: (p.salePrice ? p.price : undefined) || (item as any).originalPrice,
      imageUrl: p.primaryImage || (p.images && p.images[0]) || (item as any).imageUrl,
      unit: p.unit || (item as any).unit,
      stock: p.stock ?? (item as any).stock,
    });
    toast.success('Added to Bag', `${p.name || (item as any).name} is now in your cart.`);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist ({wishlist.length})</Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#0b6234" />
        </View>
      ) : wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Your Wishlist is Empty"
            description="Tap the heart icon on any product in our store to save it to your wishlist for later."
            actionLabel="Explore Groceries"
            onAction={() => router.push('/')}
          />
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id || item.productId}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          ListHeaderComponent={
            !isAuthenticated ? (
              <TouchableOpacity
                style={styles.guestBanner}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.8}
              >
                <View style={styles.guestBannerIconWrap}>
                  <Icon name="Cloud" size={20} color="#0b6234" />
                </View>
                <View style={styles.guestBannerTextWrap}>
                  <Text style={styles.guestBannerTitle}>Sync your wishlist</Text>
                  <Text style={styles.guestBannerSubtitle}>
                    Sign in to permanently save your favorites to your account.
                  </Text>
                </View>
                <Icon name="ChevronRight" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : undefined
          }
          renderItem={({ item }) => {
            const p = item.product || item;
            const imgUri = p.primaryImage || (p.images && p.images[0]) || (item as any).imageUrl || '';
            const isOutOfStock = p.stock != null && p.stock <= 0;

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  onPress={() =>
                    openQuickView({
                      id: p.id || item.productId,
                      slug: p.slug || (item as any).slug,
                      name: p.name || (item as any).name,
                      banglaName: p.nameBn || (p as any).banglaName || (item as any).nameBn,
                      price: p.salePrice ?? p.price ?? (item as any).price,
                      originalPrice: (p as any).regularPrice || (p as any).originalPrice || (item as any).originalPrice,
                      imageUrl: imgUri,
                      unit: p.unit || (item as any).unit || 'pc',
                      stock: p.stock ?? (item as any).stock,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.imageContainer}>
                    {imgUri ? (
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.productImg}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={styles.placeholderImg}>
                        <Icon name="Package" size={32} color="#94a3b8" />
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleRemove(item.productId || p.id || item.id)}
                      style={styles.heartBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Remove from wishlist"
                    >
                      <Icon name="Heart" size={16} color="#ef4444" fill="#ef4444" />
                    </TouchableOpacity>

                    {p.isFresh && (
                      <View style={styles.freshBadge}>
                        <Badge label="Fresh" variant="fresh" size="sm" />
                      </View>
                    )}
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {p.name || (item as any).name}
                    </Text>
                    {Boolean(p.nameBn || (item as any).nameBn) && (
                      <Text style={styles.unitText} numberOfLines={1}>
                        {p.nameBn || (item as any).nameBn}
                      </Text>
                    )}

                    <View style={styles.priceRow}>
                      <Price
                        amount={p.salePrice ?? p.price ?? (item as any).price}
                        originalAmount={
                          (p.salePrice ? p.price : undefined) ||
                          (item as any).originalPrice ||
                          (p as any).regularPrice
                        }
                        size="sm"
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.actionSection}>
                  <Button
                    title={isOutOfStock ? 'Out of Stock' : 'Move to Bag'}
                    variant={isOutOfStock ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={isOutOfStock}
                    onPress={() => handleMoveToCart(item)}
                  />
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  guestBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBannerTextWrap: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  guestBannerSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    padding: 10,
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImg: {
    width: '90%',
    height: '90%',
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  freshBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  infoBox: {
    marginTop: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    minHeight: 34,
  },
  unitText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  priceRow: {
    marginTop: 4,
    marginBottom: 6,
  },
  actionSection: {
    marginTop: 4,
  },
});
