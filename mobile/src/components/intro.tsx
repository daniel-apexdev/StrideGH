import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { brand, fonts } from '@/theme';

import { LogoMark, Wordmark } from './logo';

const MARK = 120;

/**
 * Opening title card, played once per launch over the first screen.
 *   0–500 ms     the S mark pops in (springs up from small, settles)
 *   350–800 ms   STRIDE GH and the tagline rise in underneath
 *   1600 ms      the card lifts away
 * Tap anywhere to skip. With "reduce motion" it's a short still card.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [mark] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => setReduced(false));
  }, []);

  useEffect(() => {
    if (reduced === null) return;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };

    if (reduced) {
      mark.setValue(1);
      word.setValue(1);
      const t = setTimeout(() => Animated.timing(out, { toValue: 1, duration: 180, useNativeDriver: true }).start(finish), 900);
      return () => clearTimeout(t);
    }

    const seq = Animated.sequence([
      Animated.parallel([
        Animated.spring(mark, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(word, { toValue: 1, duration: 450, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(700),
      Animated.timing(out, { toValue: 1, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    seq.start(finish);
    return () => seq.stop();
  }, [reduced, mark, word, out, onDone]);

  const skip = () => Animated.timing(out, { toValue: 1, duration: 160, useNativeDriver: true }).start(() => onDone());

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.card,
        {
          opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }],
        },
      ]}
    >
      <Pressable style={styles.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="Stride GH. Tap to skip">
        <Animated.View
          style={{
            opacity: mark.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
            transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          }}
        >
          <LogoMark size={MARK} />
        </Animated.View>
        <Animated.View
          style={{
            alignItems: 'center',
            gap: 8,
            marginTop: 22,
            opacity: word,
            transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <Wordmark size={40} />
          <Text style={styles.tagline}>RACES & RUNNING GEAR IN GHANA</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: brand.forest, zIndex: 100 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagline: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2.2, color: '#CFE0D6' },
});
