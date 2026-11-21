import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, CircleButton } from '@/components/controls';
import { Icon } from '@/components/icons';
import { ImageViewer, PhotoCarousel } from '@/components/gallery';
import { PosterImage } from '@/components/poster';
import { EventTile, Numeral, VerificationBadge } from '@/components/race';
import { ErrorState, Message, Shimmer } from '@/components/states';
import { Body, Display, Label, Title } from '@/components/type';
import { useColors } from '@/lib/appearance';
import { SITE_URL } from '@/lib/config';
import {
  countdown,
  coverNumeral,
  distanceSummary,
  feeLabel,
  formatDate,
  formatPrice,
  formatStartTime,
  googleCalendarUrl,
  hostOf,
  isPast,
  locationLabel,
  mapsUrl,
  nextEdition,
  type RaceEvent,
} from '@/lib/races';
import { toggleSaved, useSaved } from '@/lib/saved';
import { useRaces } from '@/lib/use-races';
import { brand, fonts, radius, space } from '@/theme';

export default function RaceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const { data, error, loading, refreshing, reload } = useRaces();
  const event = data?.events.find((e) => e.slug === slug);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, gap: space.md }}>
        <Shimmer style={{ height: 380, borderRadius: 0 }} />
        <Shimmer style={{ height: 40, marginHorizontal: space.gutter }} />
        <Shimmer style={{ height: 140, marginHorizontal: space.gutter }} />
      </View>
    );
  }
  if (error && !data) {
    return (
      <Screen>
        <BackBar />
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    );
  }
  if (!event || !data) {
    return (
      <Screen>
        <BackBar />
        <Message
          icon="flag"
          title="Wrong turn"
          body="We couldn't find that race. It may have been removed or renamed."
          action={<Button label="Browse races" onPress={() => router.replace('/events')} />}
        />
      </Screen>
    );
  }
  // Keyed by slug: opening another race from "Other races" starts fresh at the top.
  return <RaceDetail key={event.slug} event={event} all={data.events} today={data.today} refreshing={refreshing} onRefresh={reload} />;
}

function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>{children}</View>;
}

function BackBar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 16 }}>
      <CircleButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/events'))} />
    </View>
  );
}

function statusCopy(e: RaceEvent) {
  if (e.verification === 'verified') {
    const when = e.verifiedAt ? formatDate.long(e.verifiedAt.slice(0, 10)) : 'recently';
    return {
      tone: 'ok' as const,
      title: `Checked against the official page · ${when}`,
      text: "The details here match the organiser's own page. Anything still unclear is noted below.",
    };
  }
  if (e.verification === 'details_tbc') {
    return {
      tone: 'warn' as const,
      title: 'Details still to be confirmed',
      text: "The organiser hasn't published full details yet. We'll update this listing when they do.",
    };
  }
  return {
    tone: 'neu' as const,
    title: 'Not yet verified by Stride GH',
    text: "This listing comes from a community race calendar. We haven't confirmed it with the organiser yet, so check the official page before you pay.",
  };
}

function RaceDetail({
  event,
  all,
  today,
  refreshing,
  onRefresh,
}: {
  event: RaceEvent;
  all: RaceEvent[];
  today: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const saved = useSaved().includes(event.slug);
  const [toast, setToast] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const past = isPast(event, today);
  const images = [...(event.poster ? [event.poster] : []), ...(event.gallery ?? [])];
  const photos = event.gallery ?? [];
  const others = all.filter((e) => e.slug !== event.slug && !isPast(e, today));
  const sameMonth = others.filter((e) => e.date.slice(0, 7) === event.date.slice(0, 7));
  const carousel = (sameMonth.length ? sameMonth : others).slice(0, 6);
  const orgCount = event.organiser ? all.filter((e) => e.organiser === event.organiser).length : 0;
  const next = nextEdition(event, all);
  const status = past
    ? {
        tone: 'neu' as const,
        title: 'This race has taken place',
        text: 'We keep past races here for reference. When the organiser announces the next edition, it gets its own page and we link it from here.',
      }
    : statusCopy(event);
  const tone = { ok: [c.okBg, c.okFg], warn: [c.warnBg, c.warnFg], neu: [c.neuBg, c.neuFg] }[status.tone];
  const map = mapsUrl(event);
  const start = formatStartTime(event.startTime);
  const hasLink = event.registration.method === 'url' && !!event.registration.url;
  const host = hostOf(event.registration.url);

  const share = () =>
    Share.share({ message: `${event.name} — ${formatDate.short(event.date)}\n${SITE_URL}/events/${event.slug}` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.volt} />}
      >
        {/* Cover with the poster slot. Organisers' square flyers will show here uncropped (contentFit="contain"). */}
        <View style={[styles.cover, { backgroundColor: event.coverColor, paddingTop: insets.top + 72 }]}>
          <Numeral text={coverNumeral(event)} size={260} opacity={0.3} style={{ right: -24, top: -30 }} />
          <View style={[styles.coverBar, { top: insets.top + 14 }]}>
            <CircleButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/events'))} />
            <View style={{ flex: 1 }} />
            <CircleButton icon="share" label="Share race" onPress={share} />
            <CircleButton
              icon="bookmark"
              label={saved ? 'Remove from saved' : 'Save race'}
              filled={saved}
              active={saved}
              onPress={() => setToast(toggleSaved(event.slug))}
            >
              <Text style={styles.saveText}>{saved ? 'Saved' : 'Save'}</Text>
            </CircleButton>
          </View>
          {event.poster && !posterFailed ? (
            <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${event.poster.alt}. Opens full screen.`} onPress={() => setViewing(0)}>
              <PosterImage poster={event.poster} maxWidth={Math.min(320, width * 0.8)} maxHeight={380} onError={() => setPosterFailed(true)} />
            </Pressable>
          ) : (
            <View accessible accessibilityRole="image" accessibilityLabel={`Poster for ${event.name}`} style={styles.poster}>
              <Numeral text={coverNumeral(event)} size={190} style={{ right: -14, bottom: -42 }} />
              <Text style={styles.posterDate}>
                {formatDate.weekday(event.date)} {formatDate.day(event.date)} {formatDate.month(event.date)}
              </Text>
              <Text style={styles.posterName}>{event.name.toUpperCase()}</Text>
              <Text style={styles.posterDist}>{distanceSummary(event.distances)}</Text>
            </View>
          )}
          {/* Past races: a darker, dimmed header so it's clear at a glance. */}
          {past ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pastShade]} /> : null}
        </View>
        <ImageViewer images={images} start={viewing} onClose={() => setViewing(null)} />

        {past ? (
          <View style={styles.pastBanner}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={styles.pastIcon}>
                <Icon name="flag" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.pastTitle}>RACE OVER</Text>
                <Body size={13} color="rgba(255,255,255,0.78)">
                  This race took place on {formatDate.long(event.date)}. Registration is closed.
                </Body>
              </View>
            </View>
            {next ? (
              <Button
                label={`Next edition: ${formatDate.short(next.date)} ${next.date.slice(0, 4)}`}
                variant="volt"
                icon="arrow"
                onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: next.slug } })}
              />
            ) : (
              <Button label="See upcoming races" variant="volt" onPress={() => router.push('/events')} />
            )}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: space.gutter, paddingTop: space.gutter, gap: 10 }}>
          <VerificationBadge event={event} today={today} />
          <Display size={40} color={past ? c.text2 : undefined}>
            {event.name}
          </Display>
        </View>

        <View style={[styles.facts, { borderColor: c.line, backgroundColor: c.line }]}>
          <Fact label="DATE" value={formatDate.long(event.date)} />
          {past ? <Fact label="STATUS" value="Race over" muted /> : <Fact label="COUNTDOWN" value={countdown(event.date, today)} />}
          <Fact label="ENTRY" value={feeLabel(event)} />
          <Fact label="START TIME" value={start ?? 'Not listed yet'} muted={!start} />
        </View>

        {photos.length ? (
          <View style={{ paddingTop: space.xl }}>
            <PhotoCarousel photos={photos} onOpen={(i) => setViewing(images.length - photos.length + i)} />
          </View>
        ) : null}

        <View style={[styles.status, { backgroundColor: tone[0] }]}>
          <Icon name="info" size={22} color={tone[1]} />
          <View style={{ flex: 1, gap: 4 }}>
            <Body size={14} weight="bold" color={tone[1]}>
              {status.title}
            </Body>
            <Body size={13} color={tone[1]}>
              {status.text}
            </Body>
          </View>
        </View>

        <View style={{ paddingHorizontal: space.gutter, paddingTop: 14, gap: 10 }}>
          {event.organiser ? (
            <Card style={styles.infoRow}>
              <View style={[styles.initials, { backgroundColor: c.hero }]}>
                <Text style={styles.initialsText}>{initials(event.organiser)}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Label>HOSTED BY</Label>
                <Body size={15} weight="bold" color={c.text}>
                  {event.organiser}
                </Body>
                <Body size={12} color={c.text2}>
                  Organiser · {orgCount} {orgCount === 1 ? 'race' : 'races'} listed
                </Body>
              </View>
            </Card>
          ) : null}
          <Card style={styles.infoRow}>
            <View style={[styles.venueIcon, { backgroundColor: c.tile }]}>
              <Icon name="map" size={22} color={c.icon} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Label>VENUE</Label>
              <Body size={14} weight="semi" color={c.text}>
                {locationLabel(event)}
              </Body>
            </View>
            {map ? (
              <Pressable accessibilityRole="link" hitSlop={10} onPress={() => Linking.openURL(map)}>
                <Body size={13} weight="bold" color={c.link}>
                  Open map
                </Body>
              </Pressable>
            ) : null}
          </Card>
        </View>

        {event.description ? (
          <Section title="About this race">
            <Body size={15}>{event.description}</Body>
            <Body size={12} color={c.text2}>
              In the organiser’s words.
            </Body>
          </Section>
        ) : null}

        <Section title="Distances & fees">
          <Card>
            {event.distances.map((d, i) => {
              const price = formatPrice(d.priceMinor, event.currency);
              return (
                <View key={d.label} style={[styles.distRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.line2 }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Title>{d.label}</Title>
                    {d.note ? (
                      <Body size={12} weight="semi" color={c.warnFg}>
                        {d.note}
                      </Body>
                    ) : null}
                  </View>
                  <Body size={14} weight="bold" color={price ? c.text : c.text2}>
                    {price ?? 'See organiser'}
                  </Body>
                </View>
              );
            })}
          </Card>
          <Body size={12} color={c.text2}>
            Fees as published by the organiser. Always confirm on the official page.
          </Body>
        </Section>

        {event.highlights.length ? (
          <Section title="Good to know">
            {event.highlights.map((h) => (
              <View key={h} style={{ flexDirection: 'row', gap: 10 }}>
                <Icon name="check" size={18} color={c.icon} strokeWidth={2.4} />
                <Body style={{ flex: 1 }}>{h}</Body>
              </View>
            ))}
            {event.walkerFriendly !== null ? (
              <Body size={13} color={c.text2}>
                Walker-friendly: {event.walkerFriendly ? 'Yes' : 'No — this is a timed challenge'}
              </Body>
            ) : null}
          </Section>
        ) : null}

        <Section title="Route">
          <View style={[styles.route, { borderColor: c.dash }]}>
            <Icon name="map" size={24} color={c.text2} strokeWidth={1.8} />
            <Body size={13} weight="semi" color={c.text2}>
              Route map not published
            </Body>
            <Body size={12} color={c.text2}>
              We&apos;ll add it when the organiser shares it.
            </Body>
          </View>
          {!past ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Add to calendar"
                icon="calendarPlus"
                variant="outline"
                style={{ flex: 1, paddingHorizontal: 8 }}
                onPress={() => Linking.openURL(googleCalendarUrl(event))}
              />
              <Button label="Share" icon="share" variant="outline" style={{ flex: 1 }} onPress={share} />
            </View>
          ) : null}
        </Section>

        {carousel.length ? (
          <View style={{ paddingTop: space.xl, gap: space.md }}>
            <View style={{ paddingHorizontal: space.gutter }}>
              <Display size={24}>{sameMonth.length ? `Other races in ${formatDate.monthName(event.date)}` : 'More upcoming races'}</Display>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: space.gutter, gap: space.md }}
            >
              {carousel.map((e) => (
                <EventTile key={e.slug} event={e} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {toast ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.toast, { backgroundColor: c.ink, borderColor: c.line, bottom: 96 + insets.bottom }]}
        >
          <Body size={14} color={c.onInk}>
            Saved to your races
          </Body>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/saved')} hitSlop={10}>
            <Body size={14} weight="bold" color={brand.volt}>
              View Saved
            </Body>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flexShrink: 1 }}>
          <Label>ENTRY</Label>
          <Text numberOfLines={1} style={[styles.barFee, { color: c.text }]}>
            {feeLabel(event)}
          </Text>
        </View>
        {past ? (
          <Button label="This race has taken place" variant="muted" disabled style={{ flex: 1 }} />
        ) : hasLink ? (
          <Button label="Official registration" variant="volt" iconRight="external" style={{ flex: 1 }} onPress={() => setSheet(true)} />
        ) : (
          <Button label="How to register" variant="outline" style={{ flex: 1 }} onPress={() => setSheet(true)} />
        )}
      </View>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable accessibilityLabel="Close" style={[styles.scrim, { backgroundColor: c.scrim }]} onPress={() => setSheet(false)} />
        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={[styles.grabber, { backgroundColor: c.line }]} />
          {hasLink ? (
            <>
              <Display size={28}>You&apos;re heading to the official site</Display>
              <Body size={14}>
                Registration and payment for this race happen on the organiser&apos;s page. Stride GH doesn&apos;t take payment for race
                entries.
              </Body>
              <View style={[styles.hostRow, { backgroundColor: c.soft }]}>
                <Icon name="lock" size={16} color={c.icon} />
                <Body size={13} color={c.text} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyBold }}>{host}</Text>
                  {event.registration.note ? ` · ${event.registration.note}` : ''}
                </Body>
              </View>
              <Button
                label={`Continue to ${host}`}
                onPress={() => {
                  setSheet(false);
                  WebBrowser.openBrowserAsync(event.registration.url!).catch(() => Linking.openURL(event.registration.url!));
                }}
              />
            </>
          ) : (
            <>
              <Display size={28}>How to register</Display>
              <Body size={14}>{event.registration.note ?? 'Registration details have not been published yet.'}</Body>
              {event.registration.url ? (
                <Button
                  label={`Read more on ${host}`}
                  variant="outline"
                  onPress={() => WebBrowser.openBrowserAsync(event.registration.url!)}
                />
              ) : null}
              {!saved ? (
                <Button
                  label="Save and check back later"
                  onPress={() => {
                    toggleSaved(event.slug);
                    setSheet(false);
                    setToast(true);
                  }}
                />
              ) : null}
            </>
          )}
          <Button label="Stay on Stride GH" variant="outline" style={{ borderColor: 'transparent' }} onPress={() => setSheet(false)} />
        </View>
      </Modal>
    </View>
  );
}

function Fact({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.fact, { backgroundColor: c.surface }]}>
      <Label>{label}</Label>
      <Body size={15} weight="semi" color={muted ? c.text2 : c.text}>
        {value}
      </Body>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: space.gutter, paddingTop: space.xl, gap: 10 }}>
      <Display size={24}>{title}</Display>
      {children}
    </View>
  );
}

function initials(name: string) {
  return name
    .replace(/^The /, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

const styles = StyleSheet.create({
  pastShade: { backgroundColor: 'rgba(13,18,16,0.55)' },
  pastBanner: { marginHorizontal: space.gutter, marginTop: space.gutter, padding: 16, gap: 14, borderRadius: radius.card, backgroundColor: '#18201c' },
  pastIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  pastTitle: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 24, color: '#fff' },
  cover: { alignItems: 'center', paddingBottom: 20, overflow: 'hidden' },
  coverBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 8, zIndex: 2 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 13, color: brand.night },
  poster: {
    width: 290,
    height: 290,
    borderRadius: 12,
    backgroundColor: brand.night,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  posterDate: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.6, color: brand.volt },
  posterName: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 40, color: brand.paper, maxWidth: 220 },
  posterDist: { fontFamily: fonts.bodySemi, fontSize: 12, color: '#B9C2BD', maxWidth: 200 },
  facts: {
    marginHorizontal: space.gutter,
    marginTop: space.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  fact: { width: '49.8%', flexGrow: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 3 },
  status: { marginHorizontal: space.gutter, marginTop: 14, padding: 14, borderRadius: radius.card, flexDirection: 'row', gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  initials: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontFamily: fonts.bodyBold, fontSize: 13, color: brand.volt },
  venueIcon: { width: 44, height: 44, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  route: {
    height: 110,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: space.gutter,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barFee: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24 },
  scrim: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: space.gutter, paddingTop: 10, gap: 14 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
});
