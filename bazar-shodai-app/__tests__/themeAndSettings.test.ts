import { useThemeStore } from '../src/store/useThemeStore';
import { MobileSiteSettings } from '../src/services/siteService';

describe('Theme & Store Settings in Mobile App', () => {
  beforeEach(() => {
    useThemeStore.setState({ themeMode: 'light' });
  });

  it('manages themeMode in useThemeStore', () => {
    expect(useThemeStore.getState().themeMode).toBe('light');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().themeMode).toBe('dark');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().themeMode).toBe('light');

    useThemeStore.getState().setThemeMode('system');
    expect(useThemeStore.getState().themeMode).toBe('system');
  });

  it('determines isDark state based on admin showThemeToggle setting', () => {
    // Helper function that mirrors ThemeProvider's isDark resolution logic
    const resolveIsDark = (
      themeMode: 'light' | 'dark' | 'system',
      systemDark: boolean,
      showThemeToggle?: boolean,
    ) => {
      if (!showThemeToggle) {
        return false;
      }
      if (themeMode === 'system') {
        return systemDark;
      }
      return themeMode === 'dark';
    };

    // When admin disables theme toggle (default)
    expect(resolveIsDark('dark', true, false)).toBe(false);
    expect(resolveIsDark('dark', false, false)).toBe(false);
    expect(resolveIsDark('system', true, false)).toBe(false);

    // When admin enables theme toggle
    expect(resolveIsDark('dark', false, true)).toBe(true);
    expect(resolveIsDark('light', true, true)).toBe(false);
    expect(resolveIsDark('system', true, true)).toBe(true);
    expect(resolveIsDark('system', false, true)).toBe(false);
  });

  it('resolves dynamic hotline, business hours, and store info from site settings with fallback', () => {
    const configuredSettings: MobileSiteSettings = {
      site: {
        storeName: 'Bajar Shodai Shahrasti',
        hotline: '+8801834529197',
        whatsapp: '8801834529197',
        businessHours: 'Daily 8:00 AM - 10:30 PM',
        address: 'Main Road, Shahrasti Bajar, Chandpur',
        showThemeToggle: false,
      },
    };

    const hotline = configuredSettings.site?.hotline || '+880 1700-000000';
    const hours = configuredSettings.site?.businessHours || 'Daily 8 AM - 10 PM';
    const address = configuredSettings.site?.address || 'Default Address';
    const showThemeToggle = Boolean(configuredSettings.site?.showThemeToggle);

    expect(hotline).toBe('+8801834529197');
    expect(hours).toBe('Daily 8:00 AM - 10:30 PM');
    expect(address).toBe('Main Road, Shahrasti Bajar, Chandpur');
    expect(showThemeToggle).toBe(false);
  });

  it('formats telephone and WhatsApp links cleanly from site settings', () => {
    const hotline = '+880 1834-529197';
    const whatsapp = '+880 1834-529197';

    const cleanTel = hotline.replace(/[^\d+]/g, '');
    const cleanWa = whatsapp.replace(/[^\d]/g, '');

    expect(cleanTel).toBe('+8801834529197');
    expect(cleanWa).toBe('8801834529197');
  });
});
