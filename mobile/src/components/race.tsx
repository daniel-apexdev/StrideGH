import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { useColors } from '@/lib/appearance';
import { countdown, coverNumeral, distanceSummary, feeLabel, formatDate, isPast, locationLabel, raceStatus, type RaceEvent } from '@/lib/races';
import { brand, fonts, radius, space } from '@/theme';

import { PosterFill } from './poster';
import { Body, Title } from './type';

/**
 * The big outlined distance numeral used on race covers ("10K", "21K").
 * React Native text can't be outlined, so it's drawn with SVG.
 */
export function Numeral({
  text,
  size,
  style,
  opacity = 1,
  strokeWidth = 1.5,
}: {
  text: string;
  size: number;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
  strokeWidth?: number;
}) {
  const width = Math.ceil(size * 0.5 * text.length + size * 0.2);
  const height = Math.ceil(size * 1.02);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', opacity }, style]}
    >
      <Svg width={width} height={height}>
        <SvgText
          x={0}
          y={size * 0.86}
          fontSize={size}
          fontFamily={fonts.displayHeavy}
          fontWeight="800"
          letterSpacing={-size * 0.03}
          fill="none"
          stroke={brand.volt}
          strokeWidth={strokeWidth}
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
}

export function VerificationBadge({ event, today, style }: { event: RaceEvent; today: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const s = isPast(event, today)
    ? { label: `Raced on ${formatDate.short(event.date)}`, bg: c.neuBg, fg: c.neuFg }
    : event.verification === 'verified'
      ? { label: 'Checked with official page', bg: c.okBg, fg: c.okFg }
      : event.verification === 'details_tbc'
        ? { label: 'Details to be confirmed', bg: c.warnBg, fg: c.warnFg }
        : { label: 'Not yet verified', bg: c.neuBg, fg: c.neuFg };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }, style]}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.badgeText, { color: s.fg }]}>
        {s.label}
      </Text>
    </View>
  );
}

export function Pill({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: c.soft }]}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.pillText, { color: c.text }]}>
        {text}
      </Text>
    </View>
  );
}

/** Horizontal card used in the events directory. */
export function EventCard({ event, today }: { event: RaceEvent; today: string }) {
  const c = useColors();
  const status = raceStatus(event, today);
  const past = status === 'past';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: event.slug } })}
      accessibilityRole="link"
      accessibilityLabel={`${event.name}, ${formatDate.short(event.date)}, ${locationLabel(event)}${past ? ', race over' : ''}`}
      style={({ pressed }) => [styles.card, { backgroundColor: past ? c.soft : c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.thumb, { backgroundColor: event.coverColor }]}>
        {event.poster ? <PosterFill poster={event.poster} /> : null}
        {past ? <View style={[StyleSheet.absoluteFill, styles.pastShade]} /> : null}
        <Text style={styles.thumbDay}>{formatDate.day(event.date)}</Text>
        <Text style={styles.thumbMonth}>{formatDate.month(event.date)}</Text>
        {event.poster ? null : <Numeral text={coverNumeral(event)} size={50} strokeWidth={1} style={{ left: 6, bottom: -12 }} />}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.kickerRow}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: past ? c.text2 : c.link }]}>
            {formatDate.short(event.date).toUpperCase()}
            {status === 'upcoming' || status === 'this-week' ? ` · ${countdown(event.date, today).toUpperCase()}` : ''}
          </Text>
          {past || status === 'today' ? <StatusChip status={status} /> : null}
        </View>
        <Title color={past ? c.text2 : undefined}>{event.name}</Title>
        <Body size={12} color={c.text2}>
          {locationLabel(event)}
        </Body>
        <View style={styles.row}>
          <Pill text={distanceSummary(event.distances)} />
          <Body size={12} weight="semi" color={c.text}>
            {feeLabel(event)}
          </Body>
        </View>
        <VerificationBadge event={event} today={today} />
      </View>
    </Pressable>
  );
}

/** "Race over" (dark) or "Race day" (volt) chip. */
export function StatusChip({ status }: { status: 'past' | 'today' | 'upcoming' | 'this-week' }) {
  if (status !== 'past' && status !== 'today') return null;
  const past = status === 'past';
  return (
    <View style={[styles.chip, { backgroundColor: past ? 'rgba(13,18,16,0.9)' : brand.volt }]}>
      <View style={[styles.chipDot, { backgroundColor: past ? 'rgba(255,255,255,0.6)' : brand.night }]} />
      <Text maxFontSizeMultiplier={1.2} style={[styles.chipText, { color: past ? '#fff' : brand.night }]}>
        {past ? 'RACE OVER' : 'RACE DAY'}
      </Text>
    </View>
  );
}

/** Compact date-led row used on Home. */
export function EventRow({ event, last }: { event: RaceEvent; last?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: event.slug } })}
      accessibilityRole="link"
      style={({ pressed }) => [styles.listRow, { borderBottomColor: c.line, borderBottomWidth: last ? 0 : 1, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.dateCol}>
        <Text style={[styles.rowDay, { color: c.text }]}>{formatDate.day(event.date)}</Text>
        <Text style={[styles.rowMonth, { color: c.text2 }]}>{formatDate.month(event.date)}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Body size={15} weight="semi" color={c.text}>
          {event.name}
        </Body>
        <Body size={13} color={c.text2}>
          {distanceSummary(event.distances)} · {feeLabel(event)}
        </Body>
      </View>
    </Pressable>
  );
}

/** Square tile for "other races" carousels. */
export function EventTile({ event }: { event: RaceEvent }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: event.slug } })}
      accessibilityRole="link"
      style={({ pressed }) => [{ width: 150, gap: 6, opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.tile, { backgroundColor: event.coverColor }]}>
        {event.poster ? <PosterFill poster={event.poster} /> : null}
        <Text style={[styles.thumbDay, { fontSize: 28 }]}>{formatDate.day(event.date)}</Text>
        <Text style={styles.thumbMonth}>{formatDate.month(event.date)}</Text>
        {event.poster ? null : <Numeral text={coverNumeral(event)} size={80} strokeWidth={1} style={{ right: -6, bottom: -18 }} />}
      </View>
      <Body size={14} weight="semi" color={c.text} numberOfLines={2}>
        {event.name}
      </Body>
      <Body size={12} color={c.text2} numberOfLines={1}>
        {distanceSummary(event.distances)} · {feeLabel(event)}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  pill: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  card: { flexDirection: 'row', gap: space.md, padding: 10, borderRadius: radius.card, borderWidth: 1 },
  thumb: { width: 92, minHeight: 124, borderRadius: radius.tile, overflow: 'hidden', padding: 8 },
  thumbDay: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 26, color: brand.paper },
  thumbMonth: { fontFamily: fonts.bodyBold, fontSize: 10, color: brand.volt },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  pastShade: { backgroundColor: 'rgba(13,18,16,0.62)' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  dateCol: { width: 48, alignItems: 'center' },
  rowDay: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30 },
  rowMonth: { fontFamily: fonts.bodyBold, fontSize: 11 },
  tile: { width: 150, height: 150, borderRadius: 12, overflow: 'hidden', padding: 10 },
});
