import { Image } from 'expo-image';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { siteAsset } from '@/lib/config';
import type { Poster } from '@/lib/races';
import { useColors } from '@/lib/appearance';
import { brand, fonts, space } from '@/theme';

import { Icon } from './icons';
import { Body, Display } from './type';

/**
 * The organiser's other images (medal, route, second flyer…) in a swipeable row under the race
 * details, like the website. Tapping one opens the full-screen viewer at that image.
 */
export function PhotoCarousel({ photos, onOpen }: { photos: Poster[]; onOpen: (i: number) => void }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const cardW = Math.min(260, Math.round(width * 0.68));
  return (
    <View style={{ gap: space.md }}>
      <View style={{ paddingHorizontal: space.gutter, gap: 2 }}>
        <Text style={[styles.kicker, { color: c.link }]}>
          {photos.length} {photos.length === 1 ? 'IMAGE' : 'IMAGES'}
        </Text>
        <Display size={24}>Photos & flyers</Display>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + space.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: space.gutter, gap: space.md }}
      >
        {photos.map((img, i) => (
          <Pressable
            key={img.src}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${img.alt}. Opens full screen.`}
            onPress={() => onOpen(i)}
            style={({ pressed }) => ({ width: cardW, gap: 8, opacity: pressed ? 0.85 : 1 })}
          >
            <View style={[styles.card, { width: cardW, height: Math.round(cardW * 1.25), borderColor: c.line, backgroundColor: c.tile }]}>
              <Image source={{ uri: siteAsset(img.src) }} contentFit="cover" cachePolicy="memory-disk" style={StyleSheet.absoluteFill} />
            </View>
            <Body size={12} color={c.text2} numberOfLines={2}>
              {img.alt}
            </Body>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Full-screen viewer: swipe between images, with a counter and the image's description. */
export function ImageViewer({ images, start, onClose }: { images: Poster[]; start: number | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [page, setPage] = useState(start ?? 0);
  const [opened, setOpened] = useState(start);
  // Reset to the tapped image each time the viewer opens.
  if (start !== opened) {
    setOpened(start);
    if (start !== null) setPage(start);
  }
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const img = images[page] ?? images[0];
  const imageH = screenH - insets.top - insets.bottom - 150;

  return (
    <Modal visible={start !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: (start ?? 0) * screenW, y: 0 }}
          // contentOffset isn't applied on every platform, so also jump once the pages are laid out.
          onContentSizeChange={() => scroller.current?.scrollTo({ x: (start ?? 0) * screenW, animated: false })}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / screenW))}
        >
          {images.map((m) => (
            <View key={m.src} style={{ width: screenW, height: screenH, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: siteAsset(m.src) }} alt={m.alt} accessibilityLabel={m.alt} contentFit="contain" style={{ width: screenW, height: imageH }} />
            </View>
          ))}
        </ScrollView>
        <View style={[styles.top, { top: insets.top + 12 }]}>
          <Text style={styles.count}>{images.length > 1 ? `${page + 1} of ${images.length}` : ''}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={styles.close}>
            <Icon name="x" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={[styles.bottom, { bottom: insets.bottom + 16 }]}>
          {img ? (
            <Text style={styles.caption} numberOfLines={3}>
              {img.alt}
            </Text>
          ) : null}
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((m, i) => (
                <View key={m.src} style={[styles.dot, i === page ? { width: 22, backgroundColor: brand.volt } : null]} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  viewer: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 20, right: 20, alignItems: 'center', gap: 12 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
});
