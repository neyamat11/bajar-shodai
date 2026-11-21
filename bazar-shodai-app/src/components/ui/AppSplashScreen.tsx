import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@/components/theme/ThemeProvider';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { hideSplashScreen } from '@/utils/splash';
import { useSiteSettings } from '@/services/siteService';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
  maxTimeoutMs?: number;
}

/**
 * Dynamic In-App Startup Splash Screen for Bazar Shodai.
 * Displays the dynamic store logo configured by the admin in the dashboard (`site.logoUrl`),
 * falling back seamlessly to the official bundled high-resolution logo.
 * Dismisses the native OS splash screen and transitions cleanly into the storefront.
 */
export function AppSplashScreen({
  onFinish,
  minDurationMs = 1200,
  maxTimeoutMs = 2500,
}: AppSplashScreenProps) {
  const { isDark, colors } = useAppTheme();
  const { data: settings, isFetched } = useSiteSettings();

  const [visible, setVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const exitFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Dismiss native OS splash screen once React Native in-app splash is ready
    void hideSplashScreen();

    // Fade and scale in the logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const startTime = Date.now();

    const dismissSplash = () => {
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onFinish?.();
      });
    };

    // Guarantee dismiss after minDurationMs, or maxTimeoutMs safety cap
    const timer = setTimeout(() => {
      dismissSplash();
    }, minDurationMs);

    const safetyTimer = setTimeout(() => {
      dismissSplash();
    }, maxTimeoutMs);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [fadeAnim, scaleAnim, exitFade, minDurationMs, maxTimeoutMs, onFinish]);

  if (!visible) {
    return null;
  }

  const storeTagline =
    settings?.site?.tagline || 'তাজা নিত্যপ্রয়োজনীয় বাজার, আপনার দোরগোড়ায়';

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          backgroundColor: isDark ? '#091510' : '#ffffff',
          opacity: exitFade,
        },
      ]}
      pointerEvents="auto"
      testID="app-startup-splash"
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Dynamic Admin-Configured Logo */}
        <BrandLogo size="2xl" showTagline={false} testID="splash-brand-logo" />

        {/* Subtle Brand Loading Spinner */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="small" color={isDark ? '#34d399' : '#0b6234'} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 280,
    lineHeight: 18,
  },
  spinnerContainer: {
    marginTop: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
