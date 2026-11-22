import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Radius } from '@/constants/layout';
import { toast } from '@/store/useToastStore';
import { haptics } from '@/services/haptics';
import { useAppTheme } from '@/components/theme/ThemeProvider';
import { useCreateReview } from '../api/reviewsApi';

export interface WriteReviewSheetProps {
  visible: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
}

export function WriteReviewSheet({
  visible,
  productId,
  productName,
  onClose,
}: WriteReviewSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<any>(null);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const createReviewMutation = useCreateReview(productId);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePickImage = async () => {
    if (images.length >= 5) {
      toast.warning('Limit reached', 'You can attach up to 5 photos');
      return;
    }

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0]?.uri;
        if (uri) {
          setImages((prev) => [...prev, uri]);
          void haptics.selection().catch(() => {});
        }
      }
    } catch {
      toast.error('Error', 'Could not open image gallery');
    }
  };

  const handleRemoveImage = (index: number) => {
    void haptics.light().catch(() => {});
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.warning('Rating required', 'Please select a star rating');
      return;
    }

    if (!comment.trim()) {
      toast.warning('Review required', 'Please write a brief description of your experience');
      return;
    }

    try {
      await createReviewMutation.mutateAsync({
        productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        images: images.length > 0 ? images : undefined,
      });

      toast.success('Review Submitted', 'Thank you for your valuable feedback!');
      void haptics.success().catch(() => {});
      setTitle('');
      setComment('');
      setImages([]);
      Keyboard.dismiss();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not submit review. Please try again.';
      toast.error('Submission failed', msg);
    }
  };

  const bottomSafePadding = isKeyboardVisible
    ? 8
    : Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 16);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}
      >
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss review sheet"
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? colors.card : '#ffffff',
              paddingBottom: bottomSafePadding,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? colors.border : '#f3f4f6' },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? colors.foreground : '#111827' },
                ]}
              >
                Write a Review
              </Text>
              <Text
                style={[
                  styles.productSubtitle,
                  { color: isDark ? '#94a3b8' : '#6b7280' },
                ]}
                numberOfLines={1}
              >
                {productName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon name="X" size={20} color={isDark ? '#94a3b8' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Star Picker */}
            <View style={styles.ratingSection}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: isDark ? colors.foreground : '#374151' },
                ]}
              >
                Overall Rating
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      void haptics.selection().catch(() => {});
                      setRating(star);
                    }}
                    style={styles.starTouch}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${star} stars`}
                  >
                    <Icon name="Star" size={32} color={star <= rating ? '#f59e0b' : '#d1d5db'} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingHint}>
                {rating === 5 && 'Outstanding! (৫ তারকা)'}
                {rating === 4 && 'Very Good (৪ তারকা)'}
                {rating === 3 && 'Average (৩ তারকা)'}
                {rating === 2 && 'Below Expectation (২ তারকা)'}
                {rating === 1 && 'Poor (১ তারকা)'}
              </Text>
            </View>

            {/* Headline */}
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: isDark ? colors.foreground : '#374151' },
                ]}
              >
                Title (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? colors.surface : '#f9fafb',
                    borderColor: isDark ? colors.border : '#e5e7eb',
                    color: isDark ? colors.foreground : '#111827',
                  },
                ]}
                placeholder="e.g. Super fresh & crisp!"
                placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                value={title}
                onChangeText={setTitle}
                maxLength={60}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 50, animated: true });
                  }, 120);
                }}
              />
            </View>

            {/* Comment */}
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: isDark ? colors.foreground : '#374151' },
                ]}
              >
                Detailed Feedback *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? colors.surface : '#f9fafb',
                    borderColor: isDark ? colors.border : '#e5e7eb',
                    color: isDark ? colors.foreground : '#111827',
                  },
                ]}
                placeholder="Tell us what you liked about the freshness, taste, packaging..."
                placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={comment}
                onChangeText={setComment}
                maxLength={500}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
              />
              <Text
                style={[
                  styles.charCount,
                  { color: isDark ? '#64748b' : '#9ca3af' },
                ]}
              >
                {comment.length}/500
              </Text>
            </View>

            {/* Photos */}
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: isDark ? colors.foreground : '#374151' },
                ]}
              >
                Add Photos ({images.length}/5)
              </Text>
              <View style={styles.photosRow}>
                {images.map((uri, idx) => (
                  <View key={idx} style={styles.photoThumbContainer}>
                    <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                    <TouchableOpacity
                      onPress={() => handleRemoveImage(idx)}
                      style={styles.removePhotoBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <Icon name="X" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 5 && (
                  <TouchableOpacity
                    onPress={handlePickImage}
                    style={[
                      styles.addPhotoBtn,
                      {
                        backgroundColor: isDark ? 'rgba(6, 78, 59, 0.2)' : '#f0fdf4',
                        borderColor: isDark ? '#059669' : '#0b6234',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Upload review image"
                  >
                    <Icon name="Camera" size={20} color={isDark ? '#34d399' : '#0b6234'} />
                    <Text
                      style={[
                        styles.addPhotoText,
                        { color: isDark ? '#34d399' : '#0b6234' },
                      ]}
                    >
                      Add Photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View
            style={[
              styles.footer,
              { borderTopColor: isDark ? colors.border : '#f3f4f6' },
            ]}
          >
            <Button
              title="Submit Review"
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              loading={createReviewMutation.isPending}
              disabled={createReviewMutation.isPending}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  productSubtitle: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 20,
  },
  ratingSection: {
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  starTouch: {
    padding: 4,
  },
  ratingHint: {
    fontSize: 13,
    color: '#0b6234',
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoThumbContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 9,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
