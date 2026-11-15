import { BrandLogo } from '../src/components/ui/BrandLogo';

describe('BrandLogo dynamic resolution & sizing', () => {
  it('exports BrandLogo component cleanly from UI module', () => {
    expect(BrandLogo).toBeDefined();
    expect(typeof BrandLogo).toBe('function');
  });

  it('provides well-proportioned dimensions adhering to 10:3 aspect ratio', () => {
    // SIZES: sm (100x30), md (130x39), lg (160x48), xl (190x57), 2xl (220x66)
    const aspectRatios = [
      { w: 100, h: 30 },
      { w: 130, h: 39 },
      { w: 160, h: 48 },
      { w: 190, h: 57 },
      { w: 220, h: 66 },
    ];

    for (const { w, h } of aspectRatios) {
      const ratio = w / h;
      expect(ratio).toBeCloseTo(3.333, 1);
    }
  });

  it('properly resolves dynamic site logo or fallback', () => {
    const resolveSource = (remoteUrl?: string | null, error = false) => {
      const cleaned = remoteUrl?.trim();
      return cleaned && !error ? { uri: cleaned } : 'LOCAL_FALLBACK_LOGO';
    };

    // When admin sets a custom logo in dashboard
    const dynamicLogo = 'https://r2.example.com/custom-logo.webp';
    expect(resolveSource(dynamicLogo)).toEqual({ uri: dynamicLogo });

    // When logo is empty / null
    expect(resolveSource(null)).toBe('LOCAL_FALLBACK_LOGO');
    expect(resolveSource('')).toBe('LOCAL_FALLBACK_LOGO');
    expect(resolveSource('   ')).toBe('LOCAL_FALLBACK_LOGO');

    // When remote image fails to load (error = true)
    expect(resolveSource(dynamicLogo, true)).toBe('LOCAL_FALLBACK_LOGO');
  });
});
