import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { siteAsset } from '@/lib/config';
import type { Poster } from '@/lib/races';

/**
 * The organiser's poster shown whole: scaled to fit inside maxWidth × maxHeight, never cropped.
 * Calls onError if the image can't load (e.g. offline), so the screen can fall back to the typographic poster.
 */
export function PosterImage({
  poster,
  maxWidth,
  maxHeight,
  onError,
}: {
  poster: Poster;
  maxWidth: number;
  maxHeight: number;
  onError: () => void;
}) {
  const scale = Math.min(maxWidth / poster.width, maxHeight / poster.height, 1.5);
  const width = Math.round(poster.width * scale);
  const height = Math.round(poster.height * scale);
  return (
    <View style={[styles.shadow, { width, height }]}>
      <Image
        source={{ uri: siteAsset(poster.src) }}
        alt={poster.alt}
        accessibilityLabel={poster.alt}
        contentFit="contain"
        transition={200}
        cachePolicy="memory-disk"
        onError={onError}
        style={{ width, height, borderRadius: 12 }}
      />
    </View>
  );
}

/**
 * Poster as a thumbnail background. Small tiles crop it (the race page shows it whole), with a dark wash
 * at the top so the date stays readable on any artwork. Renders nothing if the image fails.
 */
export function PosterFill({ poster }: { poster: Poster }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <>
      <Image
        source={{ uri: siteAsset(poster.src) }}
        accessible={false}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.washTop} />
    </>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  washTop: { position: 'absolute', left: 0, right: 0, top: 0, height: '60%', backgroundColor: 'rgba(0,0,0,0.45)' },
});
