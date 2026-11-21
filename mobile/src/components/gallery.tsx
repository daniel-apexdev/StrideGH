import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/lib/appearance';
import { siteAsset } from '@/lib/config';
import type { Poster } from '@/lib/races';
import { space } from '@/theme';

import { Icon } from './icons';
import { Body } from './type';

/**
 * A swipeable row of the organiser's images (poster, medal, route…). Tap one to see it full screen,
 * then swipe between them.
 */
export function Gallery({ images, height = 220 }: { images: Poster[]; height?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <View style={{ gap: 6 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: space.gutter }}>
        {images.map((img, i) => (
          <Pressable
            key={img.src}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${img.alt}. Opens full screen.`}
            onPress={() => setOpen(i)}
            style={[styles.thumb, { borderColor: c.line, backgroundColor: c.tile }]}
          >
            <Image
              source={{ uri: siteAsset(img.src) }}
              contentFit="contain"
              transition={150}
              cachePolicy="memory-disk"
              style={{ height, width: Math.round((height * img.width) / img.height) }}
            />
          </Pressable>
        ))}
      </ScrollView>
      <Body size={12} color={c.text2} style={{ paddingHorizontal: space.gutter }}>
        Swipe for more from the organiser · tap to open full size
      </Body>

      <Modal visible={open !== null} animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        <View style={styles.viewer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (open ?? 0) * screenW, y: 0 }}>
            {images.map((img) => (
              <View key={img.src} style={{ width: screenW, height: screenH, alignItems: 'center', justifyContent: 'center' }}>
                <Image
                  source={{ uri: siteAsset(img.src) }}
                  alt={img.alt}
                  accessibilityLabel={img.alt}
                  contentFit="contain"
                  style={{ width: screenW, height: screenH - insets.top - insets.bottom - 80 }}
                />
              </View>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setOpen(null)}
            hitSlop={10}
            style={[styles.close, { top: insets.top + 12 }]}
          >
            <Icon name="x" size={22} color="#111714" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  viewer: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
