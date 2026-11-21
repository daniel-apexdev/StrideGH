import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ApiError, EventsResponse } from '@/lib/api';
import { useColors } from '@/lib/appearance';
import { API_BASE } from '@/lib/config';
import { space } from '@/theme';

import { Button } from './controls';
import { Icon, type IconName } from './icons';
import { Body, Display, Label } from './type';

/** Breathing placeholder block for loading states. Still when "reduce motion" is on. */
export function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const [v] = useState(() => new Animated.Value(0.5));
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, v]);
  return <Animated.View style={[{ backgroundColor: c.tile, borderRadius: 12, opacity: reduced ? 0.8 : v }, style]} />;
}

/** Centred message: empty and error states share one calm layout. */
export function Message({
  icon,
  kicker,
  title,
  body,
  action,
  style,
}: {
  icon?: IconName;
  kicker?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[styles.msg, style]} accessibilityLiveRegion="polite">
      {icon ? (
        <View style={[styles.badge, { backgroundColor: c.tile }]}>
          <Icon name={icon} size={30} color={c.icon} strokeWidth={1.8} />
        </View>
      ) : null}
      {kicker ? <Label color={c.clay}>{kicker}</Label> : null}
      <Display size={26} style={{ textAlign: 'center' }}>
        {title}
      </Display>
      {body ? (
        <Body size={14} color={c.text2} style={{ textAlign: 'center' }}>
          {body}
        </Body>
      ) : null}
      {action ? <View style={{ marginTop: space.sm, alignSelf: 'stretch', alignItems: 'center' }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry, style }: { error: ApiError; onRetry?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Message
      style={style}
      icon="info"
      kicker={error.offline ? 'NO CONNECTION' : 'SOMETHING WENT WRONG'}
      title={error.offline ? "Can't reach Stride GH" : "That didn't load"}
      body={error.offline ? `${error.message}\n\nTrying ${API_BASE}` : error.message}
      action={onRetry ? <Button label="Try again" variant="outline" onPress={onRetry} /> : null}
    />
  );
}

/**
 * Shown when the app couldn't reach the website's API and is using the race list built into the app.
 * Pull to refresh (or the button) tries live data again.
 */
export function OfflineNote({
  data,
  onRetry,
  style,
}: {
  data: EventsResponse | undefined;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  if (!data || data.source !== 'bundled') return null;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.note, { backgroundColor: c.warnBg }, style]}>
      <Icon name="info" size={20} color={c.warnFg} />
      <View style={{ flex: 1, gap: 4 }}>
        <Body size={14} weight="bold" color={c.warnFg}>
          Showing the race list built into the app
        </Body>
        <Body size={13} color={c.warnFg}>
          {`Couldn't reach live data at ${API_BASE}. Races may be out of date.`}
        </Body>
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
          <Body size={13} weight="bold" color={c.warnFg} style={{ textDecorationLine: 'underline' }}>
            Try live data again
          </Body>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14 },
  msg: { paddingHorizontal: space.gutter, paddingVertical: 48, gap: space.md, alignItems: 'center' },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
});
