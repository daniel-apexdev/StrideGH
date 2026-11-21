import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/controls';
import { Field, Input } from '@/components/form';
import { Icon } from '@/components/icons';
import { Body, Display, Label, Title } from '@/components/type';
import { api } from '@/lib/api';
import { useColors } from '@/lib/appearance';
import { saveDraft, useMine } from '@/lib/listing';
import { formatDate } from '@/lib/races';
import { inputToDraft, type PublicSubmission, type SubmissionStatus } from '@/lib/submission';
import { brand, radius, space } from '@/theme';

const explain: Record<SubmissionStatus, string> = {
  pending: 'We’re checking the details against your official page. This usually takes up to 2 working days.',
  changes_requested: 'We need a few changes before this can go live. See the note, then edit and send it back.',
  approved: 'Your race is live on Stride GH.',
  rejected: 'We couldn’t list this race. The note explains why.',
};

type Result = { status: 'loading' } | { status: 'ok'; sub: PublicSubmission } | { status: 'error'; message: string };

/** Races sent from this phone, plus a lookup by reference and email. */
export default function MySubmissions() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const mine = useMine();
  const [results, setResults] = useState<Record<string, Result>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<Result | null>(null);

  const fetchOne = useCallback(async (ref: string, mail: string): Promise<Result> => {
    try {
      return { status: 'ok', sub: (await api.submission(ref, mail)).submission };
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : 'Couldn’t check this one.' };
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    const entries = await Promise.all(mine.map(async (m) => [m.reference, await fetchOne(m.reference, m.email)] as const));
    setResults(Object.fromEntries(entries));
    setRefreshing(false);
  }, [mine, fetchOne]);

  // Check every race sent from this phone when the screen opens (and when the list changes).
  useEffect(() => {
    let live = true;
    Promise.all(mine.map(async (m) => [m.reference, await fetchOne(m.reference, m.email)] as const)).then((entries) => {
      if (live) setResults(Object.fromEntries(entries));
    });
    return () => {
      live = false;
    };
  }, [mine, fetchOne]);

  const find = async () => {
    if (!reference.trim() || !email.trim()) return;
    setLookup({ status: 'loading' });
    setLookup(await fetchOne(reference, email));
  };

  const edit = async (sub: PublicSubmission) => {
    if (!sub.data) return;
    await saveDraft({ draft: inputToDraft(sub.data), step: 0, resubmit: sub.reference });
    router.push('/list/form');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={brand.volt} />}
      contentContainerStyle={{
        padding: space.gutter,
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + space.xxl,
        gap: space.xl,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/list'))}
        style={[styles.back, { backgroundColor: c.surface, borderColor: c.line }]}
      >
        <Icon name="back" size={20} color={c.text} />
      </Pressable>
      <View style={{ gap: space.sm }}>
        <Display size={36}>Your submissions</Display>
        <Body color={c.text2}>See where your race is in review. Pull down to refresh.</Body>
      </View>

      {mine.length ? (
        <View style={{ gap: space.md }}>
          <Label>SENT FROM THIS PHONE</Label>
          {mine.map((m) => (
            <SubmissionCard
              key={m.reference}
              name={m.name}
              reference={m.reference}
              result={results[m.reference] ?? { status: 'loading' }}
              onEdit={edit}
            />
          ))}
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Label>{mine.length ? 'CHECK ANOTHER' : 'CHECK A SUBMISSION'}</Label>
        <Field label="Reference">
          <Input
            value={reference}
            onChangeText={(v) => setReference(v.toUpperCase())}
            placeholder="SGH-XXXXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Reference"
          />
        </Field>
        <Field label="Email you used">
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email"
          />
        </Field>
        <Button label="Check status" onPress={find} disabled={lookup?.status === 'loading'} />
      </View>
      {lookup ? <SubmissionCard name={null} reference={reference.trim().toUpperCase()} result={lookup} onEdit={edit} /> : null}

      <Button label="List another race" variant="outline" icon="calendarPlus" onPress={() => router.push('/list')} />
    </ScrollView>
  );
}

function SubmissionCard({
  name,
  reference,
  result,
  onEdit,
}: {
  name: string | null;
  reference: string;
  result: Result;
  onEdit: (s: PublicSubmission) => void;
}) {
  const c = useColors();
  const tone: Record<SubmissionStatus, [string, string]> = {
    pending: [c.warnBg, c.warnFg],
    changes_requested: [c.neuBg, c.neuFg],
    approved: [c.okBg, c.okFg],
    rejected: [c.neuBg, c.neuFg],
  };
  const sub = result.status === 'ok' ? result.sub : null;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label>
            {reference}
            {sub ? ` · ${formatDate.short(sub.raceDate)}` : ''}
          </Label>
          <Title size={22}>{sub?.raceName ?? name ?? reference}</Title>
        </View>
        {sub ? (
          <View style={[styles.pill, { backgroundColor: tone[sub.status][0] }]}>
            <Body size={12} weight="bold" color={tone[sub.status][1]}>
              {sub.statusLabel}
            </Body>
          </View>
        ) : null}
      </View>
      {result.status === 'loading' ? <ActivityIndicator color={c.icon} style={{ alignSelf: 'flex-start' }} /> : null}
      {result.status === 'error' ? (
        <Body size={13} color={c.danger}>
          {result.message}
        </Body>
      ) : null}
      {sub ? (
        <>
          <Body size={14}>{explain[sub.status]}</Body>
          {sub.reviewerNote ? (
            <View style={[styles.note, { backgroundColor: c.soft }]}>
              <Label>FROM THE STRIDE GH TEAM</Label>
              <Body size={14} color={c.text}>
                {sub.reviewerNote}
              </Body>
            </View>
          ) : null}
          {sub.status === 'approved' && sub.publishedSlug ? (
            <Button
              label="See your race"
              iconRight="arrow"
              onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: sub.publishedSlug! } })}
            />
          ) : null}
          {sub.status === 'changes_requested' && sub.data ? <Button label="Edit and resubmit" onPress={() => onEdit(sub)} /> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  note: { borderRadius: radius.button, padding: space.md, gap: 4 },
});
