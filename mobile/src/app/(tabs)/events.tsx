import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, tap } from '@/components/controls';
import { Icon } from '@/components/icons';
import { EventCard } from '@/components/race';
import { ErrorState, Message, OfflineNote, Shimmer } from '@/components/states';
import { Body, Display, Label } from '@/components/type';
import { useColors } from '@/lib/appearance';
import { citiesOf, distanceCategories, filterEvents, type EventFilters } from '@/lib/races';
import { useRaces } from '@/lib/use-races';
import { brand, fonts, radius, space } from '@/theme';

const whenLabels = { upcoming: 'upcoming', '30days': 'in the next 30 days', past: 'past races' } as const;

export default function Events() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const { data, error, loading, refreshing, reload } = useRaces();
  const [f, setF] = useState<EventFilters>({ q: params.q ?? '', when: 'upcoming' });
  const [more, setMore] = useState(false);
  // A new search from Home replaces the current one.
  const [lastParam, setLastParam] = useState(params.q);
  if (params.q !== lastParam) {
    setLastParam(params.q);
    setF((prev) => ({ ...prev, q: params.q ?? '' }));
  }

  const set = (change: Partial<EventFilters>) => setF((prev) => ({ ...prev, ...change }));
  const today = data?.today ?? '';
  const list = data ? filterEvents(data.events, f, today) : [];
  const cities = data ? citiesOf(data.events) : [];
  const moreActive = [f.when !== 'upcoming', !!f.city, !!f.fee].filter(Boolean).length;

  const header = (
    <View style={[styles.header, { borderBottomColor: c.line, paddingTop: insets.top + space.lg }]}>
      <View>
        <Display size={36}>Races & events</Display>
        <Body size={13} color={c.text2}>
          {data ? `${list.length} ${list.length === 1 ? 'race' : 'races'} · ${whenLabels[f.when ?? 'upcoming']}` : ' '}
        </Body>
      </View>
      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="search" size={18} color={c.text2} />
        <TextInput
          value={f.q}
          onChangeText={(q) => set({ q })}
          placeholder="Race name, town or organiser"
          placeholderTextColor={c.text2}
          returnKeyType="search"
          accessibilityLabel="Search races"
          style={[styles.searchInput, { color: c.text }]}
        />
        {f.q ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => set({ q: '' })}>
            <Icon name="x" size={18} color={c.text2} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space.gutter }}
        contentContainerStyle={styles.chips}
      >
        <Chip label="All distances" on={!f.distance} onPress={() => set({ distance: undefined })} />
        {distanceCategories.map((d) => (
          <Chip key={d} label={d === 'Other' ? 'Other distances' : d} on={f.distance === d} onPress={() => set({ distance: d })} />
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: more }}
        onPress={() => {
          tap();
          setMore((m) => !m);
        }}
        style={styles.moreBtn}
      >
        <Icon name="sliders" size={16} color={c.text} />
        <Body size={13} weight="semi" color={c.text}>
          {more ? 'Fewer filters' : 'More filters'}
        </Body>
        {moreActive > 0 ? (
          <View style={[styles.count, { backgroundColor: c.primary }]}>
            <Body size={11} weight="bold" color={c.onPrimary}>
              {String(moreActive)}
            </Body>
          </View>
        ) : null}
      </Pressable>
      {more ? (
        <View style={{ gap: space.md }}>
          <Group label="WHEN">
            <Chip label="Upcoming" on={f.when === 'upcoming'} onPress={() => set({ when: 'upcoming' })} />
            <Chip label="Next 30 days" on={f.when === '30days'} onPress={() => set({ when: '30days' })} />
            <Chip label="Past races" on={f.when === 'past'} onPress={() => set({ when: 'past' })} />
          </Group>
          <Group label="WHERE">
            <Chip label="Anywhere" on={!f.city} onPress={() => set({ city: undefined })} />
            {cities.map((city) => (
              <Chip key={city} label={city} on={f.city === city} onPress={() => set({ city })} />
            ))}
            <Chip label="Venue not listed" on={f.city === 'unlisted'} onPress={() => set({ city: 'unlisted' })} />
          </Group>
          <Group label="ENTRY FEE">
            <Chip label="Any" on={!f.fee} onPress={() => set({ fee: undefined })} />
            <Chip label="Free" on={f.fee === 'free'} onPress={() => set({ fee: 'free' })} />
            <Chip label="Paid" on={f.fee === 'paid'} onPress={() => set({ fee: 'paid' })} />
            <Chip label="Unconfirmed" on={f.fee === 'unconfirmed'} onPress={() => set({ fee: 'unconfirmed' })} />
          </Group>
        </View>
      ) : null}
      <OfflineNote data={data} onRetry={reload} />
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      data={loading || (error && !data) ? [] : list}
      keyExtractor={(e) => e.slug}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: space.xxl }}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: space.gutter }}>
          <EventCard event={item} today={today} />
        </View>
      )}
      ListHeaderComponentStyle={{ marginBottom: space.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={brand.volt} />}
      ListEmptyComponent={
        loading ? (
          <View style={{ paddingHorizontal: space.gutter, gap: space.md }}>
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} style={{ height: 146 }} />
            ))}
          </View>
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Message
            icon="calendar"
            title="No races match"
            body="Try another distance, place or date range."
            action={<Button label="Clear filters" variant="outline" onPress={() => setF({ q: '', when: 'upcoming' })} />}
          />
        )
      }
      ListFooterComponent={
        data ? (
          <View style={{ paddingHorizontal: space.gutter, paddingTop: space.lg, gap: space.md }}>
            <Body size={12} color={c.text2}>
              “Checked” means we matched the listing to the organiser&apos;s official page. “Not yet verified” means it came from a
              community calendar — check the official page before paying. Past races move to “Past races” automatically.
            </Body>
            <Pressable accessibilityRole="button" onPress={() => router.push('/list')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Body size={14} weight="bold" color={c.link}>
                Organising a race? List it here →
              </Body>
            </Pressable>
          </View>
        ) : undefined
      }
      ListFooterComponentStyle={{ paddingBottom: space.xl }}
    />
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }} accessibilityLabel={label}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.gutter, paddingBottom: space.md, gap: space.md, borderBottomWidth: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, height: 48 },
  chips: { paddingHorizontal: space.gutter, gap: 8 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, alignSelf: 'flex-start' },
  count: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
});
