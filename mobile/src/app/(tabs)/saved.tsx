import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/controls';
import { Icon } from '@/components/icons';
import { ErrorState, Message, Shimmer } from '@/components/states';
import { Body, Display, Title } from '@/components/type';
import { useColors } from '@/lib/appearance';
import { countdown, distanceSummary, feeLabel, formatDate, hostOf, isPast, type RaceEvent } from '@/lib/races';
import { toggleSaved, useSaved } from '@/lib/saved';
import { useRaces } from '@/lib/use-races';
import { brand, fonts, radius, space } from '@/theme';

export default function Saved() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const saved = useSaved();
  const { data, error, loading, refreshing, reload } = useRaces();
  const today = data?.today ?? '';
  const list = data ? data.events.filter((e) => saved.includes(e.slug)) : [];

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxl, gap: space.md }}
      data={loading || (error && !data) ? [] : list}
      keyExtractor={(e) => e.slug}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={brand.volt} />}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + space.lg, gap: space.md, marginBottom: space.xs }}>
          <Display size={36}>Saved races</Display>
          <View style={[styles.note, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Icon name="info" size={18} color={c.text2} />
            <Body size={13} style={{ flex: 1 }}>
              Saved on this phone. Accounts that sync across devices are coming later.
            </Body>
          </View>
        </View>
      }
      renderItem={({ item }) => <SavedCard event={item} today={today} />}
      ListEmptyComponent={
        loading ? (
          <View style={{ gap: space.md }}>
            <Shimmer style={{ height: 120 }} />
            <Shimmer style={{ height: 120 }} />
          </View>
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Message
            icon="calendar"
            title="No saved races yet"
            body="Tap Save on any race and we'll keep it here with its countdown."
            action={<Button label="Find a race" onPress={() => router.navigate('/events')} />}
          />
        )
      }
    />
  );
}

function SavedCard({ event, today }: { event: RaceEvent; today: string }) {
  const c = useColors();
  const past = isPast(event, today);
  const note = past
    ? { text: 'This race has taken place', bg: c.neuBg, fg: c.neuFg }
    : event.verification === 'details_tbc'
      ? { text: "Details still to be confirmed — we'll update this", bg: c.warnBg, fg: c.warnFg }
      : event.registration.method === 'url' && event.registration.url
        ? { text: `Register on ${hostOf(event.registration.url)}`, bg: c.neuBg, fg: c.neuFg }
        : { text: 'See how to register', bg: c.neuBg, fg: c.neuFg };

  return (
    <Card style={{ overflow: 'hidden' }}>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: event.slug } })}
          accessibilityRole="link"
          style={{ flex: 1, flexDirection: 'row', gap: 12 }}
        >
          <View style={[styles.date, { backgroundColor: event.coverColor }]}>
            <Text style={styles.day}>{formatDate.day(event.date)}</Text>
            <Text style={styles.month}>{formatDate.month(event.date)}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Title size={20}>{event.name}</Title>
            <Body size={12} color={c.text2}>
              {distanceSummary(event.distances)} · {feeLabel(event)}
            </Body>
            <Body size={12} weight="bold" color={c.link}>
              {countdown(event.date, today)}
            </Body>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${event.name} from saved`}
          onPress={() => toggleSaved(event.slug)}
          style={styles.remove}
        >
          <Icon name="bookmark" size={18} color={brand.night} filled />
        </Pressable>
      </View>
      <View style={[styles.foot, { backgroundColor: note.bg }]}>
        <Icon name="clock" size={14} color={note.fg} strokeWidth={2.2} />
        <Body size={12} weight="semi" color={note.fg}>
          {note.text}
        </Body>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12, padding: 12 },
  date: { width: 64, height: 64, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  day: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, color: brand.paper },
  month: { fontFamily: fonts.bodyBold, fontSize: 10, color: brand.volt },
  remove: { width: 44, height: 44, borderRadius: 22, backgroundColor: brand.volt, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
});
