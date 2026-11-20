import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { googleLoginApi } from '@/features/auth/api/login';
import { useAuthStore } from '@/store/useAuthStore';
import { getOrCreateGuestToken } from '@/utils/guestToken';
import { haptics } from '@/services/haptics';
import { toast } from '@/store/useToastStore';
import { getErrorMessage } from '@/api/errorHandler';
import { Radius } from '@/constants/layout';
import { useTranslation } from '@/i18n';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '302074665927-ku2ajdtkae2kj8or8ph5e9kgrjdkn9gj.apps.googleusercontent.com';

export interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GoogleAuthButton({ onSuccess, onError, disabled = false, style }: GoogleAuthButtonProps) {
  const { isBn } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [isProcessing, setIsProcessing] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email'],
    redirectUri: makeRedirectUri({
      scheme: 'bajarshodai',
      preferLocalhost: false,
    }),
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const { authentication, params } = response;
      const token =
        authentication?.idToken ||
        authentication?.accessToken ||
        params?.id_token ||
        params?.access_token;

      if (!token) {
        setIsProcessing(false);
        const errorMsg = isBn
          ? 'গুগল সাইন-ইন টোকেন পাওয়া যায়নি'
          : 'Google sign-in token could not be retrieved';
        onError?.(errorMsg);
        toast.error('Google Sign-In Error', errorMsg);
        return;
      }

      void handleGoogleToken(token);
    } else if (response.type === 'error') {
      setIsProcessing(false);
      const errorMsg =
        response.error?.message ||
        (isBn
          ? 'গুগল সাইন-ইন সম্পন্ন করা যায়নি'
          : 'Google sign-in could not be completed');
      onError?.(errorMsg);
      toast.error('Google Sign-In Failed', errorMsg);
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setIsProcessing(false);
    }
  }, [response]);

  const handleGoogleToken = async (token: string) => {
    try {
      setIsProcessing(true);
      haptics.light();
      const guestToken = getOrCreateGuestToken();
      const session = await googleLoginApi({
        idToken: token,
        guestToken,
      });

      await login(session);
      haptics.success();
      toast.success(
        isBn ? 'স্বাগতম!' : 'Welcome!',
        session.user?.name
          ? isBn
            ? `${session.user.name} হিসেবে লগইন সফল`
            : `Logged in as ${session.user.name}`
          : isBn
            ? 'গুগল লগইন সফল হয়েছে'
            : 'Google login successful',
      );

      onSuccess?.();
    } catch (error: unknown) {
      haptics.error();
      const msg = getErrorMessage(
        error,
        isBn
          ? 'গুগল সাইন-ইন সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।'
          : 'Google sign-in could not be completed. Please try again.',
      );
      onError?.(msg);
      toast.error(isBn ? 'গুগল লগইন ব্যর্থ' : 'Google Login Failed', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePress = async () => {
    if (disabled || isProcessing) return;
    try {
      setIsProcessing(true);
      haptics.light();
      await promptAsync();
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = getErrorMessage(err, 'Failed to launch Google sign-in prompt');
      onError?.(msg);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isProcessing}
      onPress={handlePress}
      style={[styles.button, style]}
      className="bg-card border border-border"
      accessibilityRole="button"
      accessibilityLabel={isBn ? 'গুগল দিয়ে চালিয়ে যান' : 'Continue with Google'}
    >
      {isProcessing ? (
        <ActivityIndicator size="small" color="#0b6234" />
      ) : (
        <View style={styles.contentRow}>
          <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.googleIcon}>
            <Path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <Path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <Path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <Path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </Svg>
          <Text style={styles.btnText} className="text-foreground">
            {isBn ? 'গুগল দিয়ে চালিয়ে যান' : 'Continue with Google'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: Radius.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
