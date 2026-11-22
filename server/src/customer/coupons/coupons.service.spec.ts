import { Prisma } from '@prisma/client';
import { CouponsService } from './coupons.service';

describe('CouponsService - Delivery Charge Discounts', () => {
  let service: CouponsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      coupon: {
        findFirst: jest.fn(),
      },
      couponUsage: {
        count: jest.fn().mockResolvedValue(0),
      },
      order: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new CouponsService(mockPrisma);
  });

  const baseCoupon = {
    id: 'c-1',
    code: 'DEL20',
    description: '৳20 off delivery',
    type: 'PUBLIC' as const,
    discountValue: new Prisma.Decimal(20),
    minOrderAmount: null,
    maxDiscount: null,
    maxUsageCount: null,
    maxUsagePerUser: null,
    usageCount: 0,
    isActive: true,
    validFrom: new Date(Date.now() - 10000),
    validTo: new Date(Date.now() + 100000),
    appliesToAllProducts: true,
    applicableCategories: null,
    applicableProducts: null,
    applicableUsers: null,
    firstOrderOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
  };

  it('evaluates DELIVERY_FIXED coupon cleanly against shipping fee', async () => {
    mockPrisma.coupon.findFirst.mockResolvedValue({
      ...baseCoupon,
      discountType: 'DELIVERY_FIXED',
      discountValue: new Prisma.Decimal(20),
    });

    const res = await service.evaluate('DEL20', {
      subtotal: 500,
      shippingCost: 50,
      lines: [{ productId: 'p1', lineTotal: 500 }],
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.discountAmount).toBe(0); // products not discounted
      expect(res.shippingDiscount).toBe(20); // ৳20 off delivery
      expect(res.discountType).toBe('DELIVERY_FIXED');
    }
  });

  it('caps DELIVERY_FIXED discount so shipping fee cannot drop below 0', async () => {
    mockPrisma.coupon.findFirst.mockResolvedValue({
      ...baseCoupon,
      code: 'BIGDEL50',
      discountType: 'DELIVERY_FIXED',
      discountValue: new Prisma.Decimal(50),
    });

    const res = await service.evaluate('BIGDEL50', {
      subtotal: 300,
      shippingCost: 35, // shipping is less than coupon amount
      lines: [{ productId: 'p1', lineTotal: 300 }],
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.discountAmount).toBe(0);
      expect(res.shippingDiscount).toBe(35); // capped at ৳35
    }
  });

  it('evaluates DELIVERY_PERCENTAGE coupon and respects maxDiscount', async () => {
    mockPrisma.coupon.findFirst.mockResolvedValue({
      ...baseCoupon,
      code: 'HALFSHIP',
      discountType: 'DELIVERY_PERCENTAGE',
      discountValue: new Prisma.Decimal(50), // 50% off
      maxDiscount: new Prisma.Decimal(25), // max ৳25 cap
    });

    const res = await service.evaluate('HALFSHIP', {
      subtotal: 400,
      shippingCost: 60, // 50% of 60 is 30, but cap is 25
      lines: [{ productId: 'p1', lineTotal: 400 }],
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.discountAmount).toBe(0);
      expect(res.shippingDiscount).toBe(25); // capped at maxDiscount ৳25
    }
  });

  it('rejects delivery discount coupon if shipping is already free', async () => {
    mockPrisma.coupon.findFirst.mockResolvedValue({
      ...baseCoupon,
      discountType: 'DELIVERY_FIXED',
      discountValue: new Prisma.Decimal(20),
    });

    const res = await service.evaluate('DEL20', {
      subtotal: 1500,
      shippingCost: 0, // already free
      lines: [{ productId: 'p1', lineTotal: 1500 }],
    });

    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.message).toContain('Shipping is already free for this order');
    }
  });
});
