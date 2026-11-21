import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, tap } from '@/components/controls';
import { Icon } from '@/components/icons';
import { PosterFill } from '@/components/poster';
import { EventRow, Numeral, Pill, VerificationBadge } from '@/components/race';
import { ErrorState, OfflineNote, Shimmer } from '@/components/states';
import { Body, Display, Label, Title } from '@/components/type';
import { setAppearance, useColors, useScheme } from '@/lib/appearance';
import { countdown, coverNumeral, distanceSummary, feeLabel, formatDate, isPast, locationLabel } from '@/lib/races';
import { useRaces } from '@/lib/use-races';
import { brand, fonts, radius, space } from '@/theme';

export default function Home() {
  const c = useColors();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const { data, error, loading, refreshing, reload } = useRaces();
  const [q, setQ] = useState('');

  const today = data?.today ?? '';
  const upcoming = data ? data.events.filter((e) => !isPast(e, today)) : [];
  const next = upcoming.find((e) => e.registration.method === 'url') ?? upcoming[0];
  const rest = upcoming.filter((e) => e !== next).slice(0, 4);

  const search = () => router.navigate({ pathname: '/events', params: q.trim() ? { q: q.trim() } : {} });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: space.xxl }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={brand.volt} />}
    >
      <View style={[styles.hero, { backgroundColor: c.hero, paddingTop: insets.top + space.lg }]}>
        <View style={styles.heroTop}>
          <Text accessibilityRole="header" accessibilityLabel="Stride GH" style={[styles.wordmark, { color: c.onHero }]}>
            STRIDE<Text style={styles.wordmarkBox}> GH </Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={() => {
              tap();
              setAppearance(scheme === 'dark' ? 'light' : 'dark');
            }}
            style={[styles.round, { borderColor: c.heroLine }]}
          >
            <Icon name={scheme === 'dark' ? 'sun' : 'moon'} size={18} color={c.onHero} />
          </Pressable>
        </View>
        <View style={{ gap: 10 }}>
          <Label color={brand.volt}>{data ? `${upcoming.length} RACES COMING UP` : 'RACES ACROSS GHANA'}</Label>
          <Text accessibilityRole="header" style={[styles.headline, { color: c.onHero }]}>
            FIND YOUR NEXT <Text style={{ color: brand.volt }}>START LINE.</Text>
          </Text>
          <Body color={c.onHero2}>Every road race in Ghana, plus running gear from local shops — in one place.</Body>
        </View>
        <View style={[styles.search, { backgroundColor: c.surface }]}>
          <Icon name="search" size={20} color={c.text} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder="Search races or places"
            placeholderTextColor={c.text2}
            accessibilityLabel="Search races"
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>
        <View style={styles.tiles}>
          <Pressable
            onPress={() => router.push('/events')}
            accessibilityRole="link"
            style={[styles.tileBtn, { backgroundColor: brand.volt }]}
          >
            <Icon name="calendar" size={22} color={brand.night} />
            <Text style={[styles.tileText, { color: brand.night }]}>Find a race →</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/shop')}
            accessibilityRole="link"
            style={[styles.tileBtn, { backgroundColor: c.hero2, borderColor: c.heroLine, borderWidth: 1 }]}
          >
            <Icon name="bag" size={22} color={c.onHero} />
            <Text style={[styles.tileText, { color: c.onHero }]}>Shop gear →</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: space.gutter, gap: space.md }}>
          <Shimmer style={{ height: 290 }} />
          <Shimmer style={{ height: 60 }} />
          <Shimmer style={{ height: 60 }} />
        </View>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <OfflineNote data={data} onRetry={reload} style={{ marginHorizontal: space.gutter, marginTop: space.gutter }} />
          {next ? (
            <View style={styles.section}>
              <Label color={c.link}>NEXT RACE WITH OPEN REGISTRATION</Label>
              <Pressable
                onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: next.slug } })}
                accessibilityRole="link"
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Card style={{ overflow: 'hidden' }}>
                  <View style={[styles.cover, { backgroundColor: next.coverColor }]}>
                    {next.poster ? (
                      <PosterFill poster={next.poster} />
                    ) : (
                      <Numeral text={coverNumeral(next)} size={180} style={{ right: -10, bottom: -40 }} />
                    )}
                    <View style={styles.dateBox}>
                      <Text style={styles.dateMonth}>{formatDate.month(next.date)}</Text>
                      <Text style={styles.dateDay}>{formatDate.day(next.date)}</Text>
                      <Text style={styles.dateMonth}>{formatDate.weekday(next.date)}</Text>
                    </View>
                    <View style={styles.countdown}>
                      <Text style={styles.countdownText}>{countdown(next.date, today)}</Text>
                    </View>
                  </View>
                  <View style={{ padding: space.lg, gap: 8 }}>
                    <Title size={26}>{next.name}</Title>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Icon name="pin" size={15} color={c.text2} />
                      <Body size={13} color={c.text2}>
                        {locationLabel(next)}
                      </Body>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill text={distanceSummary(next.distances)} />
                      <Body size={13} weight="semi" color={c.text}>
                        {feeLabel(next)}
                      </Body>
                      <VerificationBadge event={next} today={today} style={{ marginLeft: 'auto' }} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Display size={28}>Coming up</Display>
              <Link href="/events" style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: c.link }}>
                See all
              </Link>
            </View>
            <View>
              {rest.map((e, i) => (
                <EventRow key={e.slug} event={e} last={i === rest.length - 1} />
              ))}
            </View>
            <Button label={`Browse all ${upcoming.length} races`} variant="outline" onPress={() => router.navigate('/events')} />
            <Body size={12} color={c.text2}>
              Listings marked “Not yet verified” come from a community race calendar and haven&apos;t been confirmed with organisers yet.
            </Body>
          </View>
        </>
      )}

      <View style={[styles.soon, { backgroundColor: c.tile }]}>
        <Label color={c.clay}>COMING SOON</Label>
        <Display size={26}>Gear from local shops</Display>
        <Body size={14}>Shoes, singlets and hydration from running shops across Ghana.</Body>
      </View>

      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.gutter }}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the race listing form"
          onPress={() => router.push('/list')}
          style={({ pressed }) => [styles.cta, { backgroundColor: c.ink, borderColor: c.line, opacity: pressed ? 0.9 : 1 }]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Body size={15} weight="bold" color={c.onInk}>
              Organising a race?
            </Body>
            <Body size={13} color={c.onInk2}>
              List it free. We check every race before it goes live.
            </Body>
          </View>
          <Icon name="arrow" size={22} color={brand.volt} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.gutter, paddingBottom: 28, gap: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { fontFamily: fonts.displayHeavy, fontSize: 26, letterSpacing: 0.5 },
  wordmarkBox: { backgroundColor: brand.volt, color: brand.night },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headline: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 48, letterSpacing: -0.5 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: radius.button, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, height: 52 },
  tiles: { flexDirection: 'row', gap: 10 },
  tileBtn: { flex: 1, borderRadius: radius.button, padding: 14, gap: 18 },
  tileText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 22 },
  section: { paddingHorizontal: space.gutter, paddingTop: space.xl, gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cover: { height: 180, overflow: 'hidden' },
  dateBox: {
    position: 'absolute',
    left: 14,
    top: 14,
    backgroundColor: brand.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dateMonth: { fontFamily: fonts.bodyBold, fontSize: 10, color: brand.muted },
  dateDay: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 30, color: brand.night },
  countdown: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: brand.volt,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countdownText: { fontFamily: fonts.bodyBold, fontSize: 11, color: brand.night },
  soon: { marginHorizontal: space.gutter, marginTop: 28, padding: 18, borderRadius: radius.card, gap: 8 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.card, borderWidth: 1 },
});
