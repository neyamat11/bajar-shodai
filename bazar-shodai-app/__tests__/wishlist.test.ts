import { useWishlistStore, normalizeWishlistItem } from '../src/store/useWishlistStore';
import { useAuthStore } from '../src/store/useAuthStore';

jest.mock('../src/api/client', () => ({
  api: {
    get: jest.fn().mockResolvedValue([]),
    post: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
}));

describe('Guest Wishlist & Account Sync Parity Tests', () => {
  beforeEach(() => {
    useWishlistStore.getState().clearWishlist();
    jest.clearAllMocks();
  });

  describe('Local Guest Wishlist Persistence', () => {
    it('allows guest to add products to wishlist without login', async () => {
      const store = useWishlistStore.getState();

      expect(store.isInWishlist('prod-1')).toBe(false);

      await store.addItem({
        id: 'prod-1',
        productId: 'prod-1',
        name: 'Fresh Mangoes',
        nameBn: 'তাজা আম',
        price: 150,
        imageUrl: 'https://cdn.example.com/mango.jpg',
      });

      const updated = useWishlistStore.getState();
      expect(updated.items).toHaveLength(1);
      expect(updated.isInWishlist('prod-1')).toBe(true);
      expect(updated.totalCount()).toBe(1);

      const item = updated.items[0]!;
      expect(item.productId).toBe('prod-1');
      expect(item.product.name).toBe('Fresh Mangoes');
      expect(item.product.nameBn).toBe('তাজা আম');
      expect(item.product.price).toBe(150);
      expect(item.product.primaryImage).toBe('https://cdn.example.com/mango.jpg');
    });

    it('prevents duplicate additions of the same product to wishlist', async () => {
      const store = useWishlistStore.getState();

      await store.addItem({ id: 'prod-1', name: 'Product 1', price: 100 });
      await store.addItem({ id: 'prod-1', name: 'Product 1', price: 100 });

      expect(useWishlistStore.getState().items).toHaveLength(1);
    });

    it('toggles item in wishlist (removes if present, adds if absent)', async () => {
      const store = useWishlistStore.getState();

      const added = await store.toggleItem({ id: 'prod-2', name: 'Product 2', price: 80 });
      expect(added).toBe(true);
      expect(useWishlistStore.getState().isInWishlist('prod-2')).toBe(true);

      const removed = await store.toggleItem({ id: 'prod-2', name: 'Product 2', price: 80 });
      expect(removed).toBe(false);
      expect(useWishlistStore.getState().isInWishlist('prod-2')).toBe(false);
    });

    it('removes item from wishlist correctly', async () => {
      const store = useWishlistStore.getState();

      await store.addItem({ id: 'prod-1', name: 'Item 1' });
      await store.addItem({ id: 'prod-2', name: 'Item 2' });
      expect(useWishlistStore.getState().items).toHaveLength(2);

      await store.removeItem('prod-1');
      expect(useWishlistStore.getState().items).toHaveLength(1);
      expect(useWishlistStore.getState().isInWishlist('prod-1')).toBe(false);
      expect(useWishlistStore.getState().isInWishlist('prod-2')).toBe(true);
    });
  });

  describe('Account Login Sync', () => {
    it('syncWishlistWithServer posts guest items to backend and loads merged list', async () => {
      const { api } = require('../src/api/client');

      // 1. Guest saves two items
      await useWishlistStore.getState().addItem({ id: 'guest-prod-1', name: 'Guest Item 1' });
      await useWishlistStore.getState().addItem({ id: 'guest-prod-2', name: 'Guest Item 2' });

      // Mock server returning merged list
      api.get.mockResolvedValueOnce([
        {
          id: 'server-fav-1',
          productId: 'guest-prod-1',
          name: 'Guest Item 1',
          price: 50,
          stock: 10,
        },
        {
          id: 'server-fav-2',
          productId: 'guest-prod-2',
          name: 'Guest Item 2',
          price: 90,
          stock: 15,
        },
        {
          id: 'server-fav-3',
          productId: 'account-prod-3',
          name: 'Existing Account Item 3',
          price: 200,
          stock: 5,
        },
      ]);

      // 2. User logs in -> syncWishlistWithServer triggers
      await useWishlistStore.getState().syncWishlistWithServer();

      // Check that both guest items were posted to server
      expect(api.post).toHaveBeenCalledWith('/customer/wishlist/guest-prod-1');
      expect(api.post).toHaveBeenCalledWith('/customer/wishlist/guest-prod-2');

      // Check merged store contains all items from server
      const updated = useWishlistStore.getState();
      expect(updated.items).toHaveLength(3);
      expect(updated.isInWishlist('guest-prod-1')).toBe(true);
      expect(updated.isInWishlist('guest-prod-2')).toBe(true);
      expect(updated.isInWishlist('account-prod-3')).toBe(true);
    });

    it('clears wishlist on user logout', async () => {
      await useWishlistStore.getState().addItem({ id: 'prod-9', name: 'Item 9' });
      expect(useWishlistStore.getState().items).toHaveLength(1);

      useWishlistStore.getState().clearWishlist();
      expect(useWishlistStore.getState().items).toHaveLength(0);
      expect(useWishlistStore.getState().isInWishlist('prod-9')).toBe(false);
    });
  });

  describe('Item Normalization', () => {
    it('handles flat server objects and nested product objects consistently', () => {
      const flat = normalizeWishlistItem({
        id: 'fav-1',
        productId: 'prod-abc',
        name: 'Rice 5kg',
        nameBn: 'চাল ৫ কেজি',
        price: 350,
        imageUrl: 'https://cdn.example.com/rice.png',
        stock: 20,
      });

      expect(flat.productId).toBe('prod-abc');
      expect(flat.product.name).toBe('Rice 5kg');
      expect(flat.product.nameBn).toBe('চাল ৫ কেজি');
      expect(flat.product.price).toBe(350);
      expect(flat.product.primaryImage).toBe('https://cdn.example.com/rice.png');

      const nested = normalizeWishlistItem({
        productId: 'prod-xyz',
        product: {
          id: 'prod-xyz',
          name: 'Dal 1kg',
          price: 120,
          primaryImage: 'https://cdn.example.com/dal.png',
        },
      });

      expect(nested.productId).toBe('prod-xyz');
      expect(nested.product.name).toBe('Dal 1kg');
      expect(nested.product.price).toBe(120);
      expect(nested.product.primaryImage).toBe('https://cdn.example.com/dal.png');
    });
  });
});
