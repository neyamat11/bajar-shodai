import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageContentFit, ImageContentPosition } from 'expo-image';
import { useSiteSettings } from '@/services/siteService';

const LOCAL_FALLBACK_LOGO = require('../../../assets/images/logo-wide.webp');

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
  showTagline?: boolean;
  onPress?: () => void;
  className?: string;
  testID?: string;
}

const SIZE_MAP = {
  sm: { width: 100, height: 30, tagSize: 9 },
  md: { width: 130, height: 39, tagSize: 10 },
  lg: { width: 160, height: 48, tagSize: 11 },
  xl: { width: 190, height: 57, tagSize: 12 },
  '2xl': { width: 220, height: 66, tagSize: 13 },
};

/**
 * Dynamic Brand Logo for Bazar Shodai.
 * Automatically loads the remote logo configured by the store owner in the dashboard
 * via `/customer/settings` (`site.logoUrl`), and falls back to the bundled high-resolution
 * local asset if no remote logo is configured or during offline / network error.
 */
export function BrandLogo({
  size = 'md',
  width: customWidth,
  height: customHeight,
  style,
  contentFit = 'contain',
  contentPosition = 'center',
  showTagline = false,
  onPress,
  className = '',
  testID = 'brand-logo',
}: BrandLogoProps) {
  const { data: settings } = useSiteSettings();
  const [hasError, setHasError] = useState(false);

  const dims = SIZE_MAP[size] || SIZE_MAP.md;
  const logoWidth = customWidth ?? dims.width;
  const logoHeight = customHeight ?? dims.height;

  const remoteLogoUrl = settings?.site?.logoUrl?.trim();
  const storeName = settings?.site?.storeName || 'Bazar Shodai';
  const tagline = settings?.site?.tagline;

  // Prioritize remote logo configured in admin settings; fallback to bundled official logo asset
  const imageSource = remoteLogoUrl && !hasError ? { uri: remoteLogoUrl } : LOCAL_FALLBACK_LOGO;

  const content = (
    <View style={[styles.container, style]} className={className} testID={testID}>
      <Image
        source={imageSource}
        style={{ width: logoWidth, height: logoHeight }}
        contentFit={contentFit}
        contentPosition={contentPosition}
        onError={() => setHasError(true)}
        accessibilityLabel={storeName}
        transition={150}
      />
      {showTagline && tagline ? (
        <Text
          style={[styles.tagline, { fontSize: dims.tagSize }]}
          className="text-muted-foreground font-medium text-center mt-1"
          numberOfLines={1}
        >
          {tagline}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    letterSpacing: 0.3,
  },
});
