import { router } from 'expo-router';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, tap } from '@/components/controls';
import { Icon } from '@/components/icons';
import { LogoMark, Runner } from '@/components/logo';
import { Body, Display, Label } from '@/components/type';
import { markWelcomed } from '@/lib/welcome';
import { brand, fonts, radius, space } from '@/theme';

const MAX_W = 560;
// The welcome flow always uses the brand's dark forest, like the intro, whatever the theme.
const ink = { bg: brand.forest, card: '#14503C', line: '#3C6A57', text: '#F4F2EC', soft: '#CFE0D6' };

type Slide = { key: string; kicker: string; title: string; body: string; art: (w: number) => ReactNode };

const SLIDES: Slide[] = [
  {
    key: 'hello',
    kicker: 'RACES · RUNNING GEAR · GHANA',
    title: 'Welcome to Stride GH',
    body: 'Every road race in Ghana and gear from local running shops, in one place. Here’s what you can do.',
    art: (w) => <LogoMark size={Math.min(170, w * 0.42)} />,
  },
  {
    key: 'find',
    kicker: 'FIND A RACE',
    title: 'Your next start line',
    body: 'Browse 5Ks to marathons across Ghana. Filter by distance, date, town and entry fee, and see what’s coming up this month.',
    art: (w) => <RaceArt width={Math.min(320, w * 0.8)} />,
  },
  {
    key: 'trust',
    kicker: 'KNOW WHAT’S CONFIRMED',
    title: 'Honest listings',
    body: 'Every race shows whether we’ve checked it with the organiser. Registration always happens on the organiser’s own page.',
    art: () => <TrustArt />,
  },
  {
    key: 'save',
    kicker: 'SAVE & SHARE',
    title: 'Never miss a race',
    body: 'Save races to keep a countdown, add them to your calendar, and share them with your running crew on WhatsApp.',
    art: () => <SaveArt />,
  },
  {
    key: 'gear',
    kicker: 'COMING SOON',
    title: 'Gear from local shops',
    body: 'Shoes, singlets and hydration from running shops near you, with prices and stock you can trust.',
    art: () => <GearArt />,
  },
];

/**
 * First-open welcome: what the app does, then create an account, sign in, or look around first.
 * Shown once per phone (Account → Show welcome again brings it back).
 */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.min(winW, MAX_W);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const last = index === SLIDES.length - 1;
  const artH = Math.max(170, Math.min(250, winH * 0.3));

  const go = (i: number) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, i));
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  const leave = (then?: 'up' | 'in') => {
    markWelcomed();
    router.replace('/');
    if (then) setTimeout(() => router.push({ pathname: '/sign-in', params: { mode: then } }), 0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: ink.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 8, width, alignSelf: 'center' }]}>
        <Text style={styles.counter}>{`${index + 1} / ${SLIDES.length}`}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => leave()}
          hitSlop={10}
          style={({ pressed }) => [styles.skip, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.skipText}>LOOK AROUND FIRST</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width, alignSelf: 'center', flexGrow: 1 }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => {
          // Web has no momentum end event: follow the scroll position
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== index) setIndex(i);
        }}
        scrollEventThrottle={64}
      >
        {SLIDES.map((s) => (
          <View
            key={s.key}
            style={{ width, paddingHorizontal: space.gutter + 4, justifyContent: 'center' }}
            accessible
            accessibilityLabel={`${s.title}. ${s.body}`}
          >
            <View style={{ height: artH, alignItems: 'center', justifyContent: 'center' }}>{s.art(width)}</View>
            <View style={{ gap: 10, marginTop: 18 }}>
              <Label color={brand.volt}>{s.kicker}</Label>
              <Display size={36} color={ink.text}>
                {s.title}
              </Display>
              <Body size={16} color={ink.soft}>
                {s.body}
              </Body>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 6, width, alignSelf: 'center' }]}>
        <View style={styles.dots} accessibilityRole="tablist">
          {SLIDES.map((s, i) => (
            <Pressable
              key={s.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`Slide ${i + 1}: ${s.title}`}
              hitSlop={8}
              onPress={() => {
                tap();
                go(i);
              }}
            >
              <View style={[styles.dot, i === index && styles.dotOn]} />
            </Pressable>
          ))}
        </View>
        {last ? (
          <>
            <Button label="Create account" variant="volt" onPress={() => leave('up')} />
            <OutlineOnDark label="I have an account · Sign in" onPress={() => leave('in')} />
          </>
        ) : (
          <>
            <Button label="Next" variant="volt" onPress={() => go(index + 1)} />
            <OutlineOnDark label="Sign in" onPress={() => leave('in')} />
          </>
        )}
      </View>
    </View>
  );
}

/** Outline button that stays light on the dark welcome background in both themes. */
function OutlineOnDark({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.outline, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Slide art (drawn, no stock imagery) ---------- */

function RaceArt({ width }: { width: number }) {
  const races = [
    { day: '28', mon: 'NOV', name: 'Gold Coast Run', meta: '5K · 10K', bg: '#0E3B2C' },
    { day: '05', mon: 'DEC', name: 'Western City Run', meta: '10K · 5K', bg: '#7A3B22' },
    { day: '12', mon: 'DEC', name: 'Millennium Night Run', meta: '5K · 10K', bg: '#111714' },
  ];
  return (
    <View style={{ width, gap: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {races.map((r, i) => (
        <View key={r.name} style={[styles.miniCard, { marginLeft: i * 14, marginRight: (2 - i) * 14 }]}>
          <View style={[styles.miniDate, { backgroundColor: r.bg }]}>
            <Text style={styles.miniDay}>{r.day}</Text>
            <Text style={styles.miniMon}>{r.mon}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.miniName} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.miniMeta}>{r.meta}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function TrustArt() {
  const badges = [
    { label: 'Checked with official page', bg: '#E3F0D8', fg: '#1F5A2E' },
    { label: 'Not yet verified', bg: '#ECEAE4', fg: '#3E4742' },
    { label: 'Details to be confirmed', bg: '#FBEFD5', fg: '#7A4B00' },
  ];
  return (
    <View style={{ gap: 12, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {badges.map((b) => (
        <View key={b.label} style={[styles.badge, { backgroundColor: b.bg }]}>
          <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
        </View>
      ))}
      <View style={[styles.regBtn]}>
        <Text style={styles.regText}>Official registration</Text>
        <Icon name="external" size={16} color={brand.night} strokeWidth={2.2} />
      </View>
    </View>
  );
}

function SaveArt() {
  return (
    <View style={{ alignItems: 'center', gap: 14 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.saveCircle}>
        <Icon name="bookmark" size={44} color={brand.night} filled />
      </View>
      <View style={styles.countPill}>
        <Icon name="clock" size={16} color={brand.night} strokeWidth={2.2} />
        <Text style={styles.countText}>In 10 days</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={styles.ghost}>
          <Icon name="calendarPlus" size={18} color={ink.text} />
        </View>
        <View style={styles.ghost}>
          <Icon name="share" size={18} color={ink.text} />
        </View>
      </View>
    </View>
  );
}

function GearArt() {
  return (
    <View style={{ alignItems: 'center', gap: 16 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <View style={[styles.gearTile, { transform: [{ rotate: '-6deg' }] }]}>
          <Icon name="bag" size={40} color={brand.volt} strokeWidth={1.6} />
        </View>
        <View style={[styles.gearTile, { width: 104, height: 104, backgroundColor: brand.volt }]}>
          <Runner pose={0} size={56} color={brand.night} />
        </View>
        <View style={[styles.gearTile, { transform: [{ rotate: '6deg' }] }]}>
          <Icon name="flag" size={36} color={brand.volt} strokeWidth={1.6} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['Shoes', 'Singlets', 'Hydration'].map((t) => (
          <View key={t} style={styles.chip}>
            <Text style={styles.chipText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.gutter },
  counter: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, color: ink.soft },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  skipText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, color: ink.text },
  bottom: { paddingHorizontal: space.gutter, gap: 10, paddingTop: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ink.line },
  dotOn: { width: 24, backgroundColor: brand.volt },
  outline: {
    minHeight: 52,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: ink.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  outlineText: { fontFamily: fonts.bodyBold, fontSize: 15, color: ink.text },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: radius.card,
    backgroundColor: ink.card,
    borderWidth: 1,
    borderColor: ink.line,
  },
  miniDate: { width: 52, height: 56, borderRadius: 8, padding: 6, overflow: 'hidden' },
  miniDay: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 20, color: brand.paper },
  miniMon: { fontFamily: fonts.bodyBold, fontSize: 9, color: brand.volt },
  miniName: { fontFamily: fonts.display, fontSize: 18, color: ink.text },
  miniMeta: { fontFamily: fonts.bodySemi, fontSize: 12, color: ink.soft },
  badge: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  regBtn: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: brand.volt,
    borderRadius: radius.button,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  regText: { fontFamily: fonts.bodyBold, fontSize: 15, color: brand.night },
  saveCircle: { width: 104, height: 104, borderRadius: 52, backgroundColor: brand.volt, alignItems: 'center', justifyContent: 'center' },
  countPill: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: brand.paper,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countText: { fontFamily: fonts.bodyBold, fontSize: 14, color: brand.night },
  ghost: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: ink.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearTile: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: ink.card,
    borderWidth: 1,
    borderColor: ink.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: ink.line, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: ink.text },
});
