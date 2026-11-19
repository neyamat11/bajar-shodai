import { googleLoginApi } from '../src/features/auth/api/login';
import { useAuthStore } from '../src/store/useAuthStore';
import { useWishlistStore } from '../src/store/useWishlistStore';
import { useCartStore } from '../src/store/useCartStore';

jest.mock('../src/api/client', () => ({
  api: {
    get: jest.fn().mockResolvedValue([]),
    post: jest.fn().mockResolvedValue({
      accessToken: 'access-jwt-token-123',
      refreshToken: 'refresh-jwt-token-123',
      userId: 'user-google-1',
      user: {
        id: 'user-google-1',
        name: 'Google Customer',
        email: 'customer@gmail.com',
        phone: '01700000000',
        role: 'CUSTOMER',
      },
    }),
    delete: jest.fn().mockResolvedValue({}),
  },
}));

describe('Google Authentication Tests', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
    useWishlistStore.getState().clearWishlist();
    useCartStore.getState().clearCart();
    jest.clearAllMocks();
  });

  it('calls /customer/auth/google with idToken and guestToken', async () => {
    const { api } = require('../src/api/client');

    const session = await googleLoginApi({
      idToken: 'mock-google-id-token',
      guestToken: 'guest-token-123',
    });

    expect(api.post).toHaveBeenCalledWith('/customer/auth/google', {
      idToken: 'mock-google-id-token',
      guestToken: 'guest-token-123',
    });

    expect(session.accessToken).toBe('access-jwt-token-123');
    expect(session.userId).toBe('user-google-1');
    expect(session.user?.email).toBe('customer@gmail.com');
  });

  it('logs user into useAuthStore and triggers cart and wishlist sync', async () => {
    const session = {
      accessToken: 'token-abc',
      refreshToken: 'refresh-abc',
      userId: 'user-999',
      user: {
        id: 'user-999',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '01700000000',
        role: 'CUSTOMER' as const,
      },
    };

    const syncWishlistSpy = jest.spyOn(useWishlistStore.getState(), 'syncWishlistWithServer');
    const syncCartSpy = jest.spyOn(useCartStore.getState(), 'syncCartFromServer');

    await useAuthStore.getState().login(session);

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().userId).toBe('user-999');
    expect(useAuthStore.getState().user?.name).toBe('John Doe');

    expect(syncCartSpy).toHaveBeenCalled();
    expect(syncWishlistSpy).toHaveBeenCalled();

    syncWishlistSpy.mockRestore();
    syncCartSpy.mockRestore();
  });
});
