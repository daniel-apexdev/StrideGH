import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/controls';
import { Icon } from '@/components/icons';
import { Body, Display, Label, Title } from '@/components/type';
import { useColors } from '@/lib/appearance';
import { clearDraft, loadDraft, useMine, type Draft } from '@/lib/listing';
import { listingGuide, steps } from '@/lib/submission';
import { brand, fonts, radius, space } from '@/theme';

/** "List your race" — what happens, what you need, and the rules, before the form. */
export default function ListIntro() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const mine = useMine();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    loadDraft().then(setDraft);
  }, []);

  const startOver = async () => {
    await clearDraft();
    router.push('/list/form');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
      <View style={[styles.hero, { backgroundColor: c.hero, paddingTop: insets.top + space.md }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))}
          style={styles.back}
        >
          <Icon name="back" size={20} color={brand.night} strokeWidth={2.2} />
        </Pressable>
        <Label color={brand.volt}>FOR ORGANISERS · FREE</Label>
        <Display size={44} color={c.onHero}>
          List your race on Stride GH
        </Display>
        <Body size={15} color={c.onHero2}>
          Reach runners across Ghana. Tell us about your race and we’ll check it against your official page before it goes live.
        </Body>
      </View>

      <View style={{ padding: space.gutter, gap: space.xl }}>
        {draft ? (
          <View style={[styles.card, { backgroundColor: c.warnBg, gap: space.sm }]}>
            <Body size={14} weight="bold" color={c.warnFg}>
              {draft.resubmit ? `You were editing ${draft.resubmit}` : 'You have a race in progress'}
            </Body>
            <Body size={13} color={c.warnFg}>
              {draft.draft.name ? `“${draft.draft.name}”, ` : ''}saved at step {draft.step + 1} of {steps.length}.
            </Body>
            <Button label="Continue where you left off" onPress={() => router.push('/list/form')} />
            <Pressable
              accessibilityRole="button"
              onPress={startOver}
              style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Body size={14} weight="semi" color={c.warnFg}>
                Start a new race instead
              </Body>
            </Pressable>
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Label>HOW IT WORKS</Label>
          {listingGuide.steps.map((s, i) => (
            <View key={s.title} style={[styles.step, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={[styles.num, { backgroundColor: c.tile }]}>
                <Title size={18} color={c.icon}>
                  {i + 1}
                </Title>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Body size={15} weight="bold" color={c.text}>
                  {s.title}
                </Body>
                <Body size={13} color={c.text2}>
                  {s.body}
                </Body>
              </View>
            </View>
          ))}
        </View>

        <List title="HAVE THESE READY" items={listingGuide.needs} icon="check" />
        <List title="LISTING GUIDELINES" items={listingGuide.rules} icon="info" />

        {!draft ? <Button label="Start listing" iconRight="arrow" onPress={() => router.push('/list/form')} /> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/list/submissions')}
          style={[styles.step, { backgroundColor: c.surface, borderColor: c.line, alignItems: 'center' }]}
        >
          <Icon name="clock" size={22} color={c.icon} />
          <View style={{ flex: 1 }}>
            <Body size={15} weight="bold" color={c.text}>
              Check a submission
            </Body>
            <Body size={13} color={c.text2}>
              {mine.length ? `${mine.length} sent from this phone` : 'Use the reference we gave you'}
            </Body>
          </View>
          <Icon name="arrow" size={20} color={c.icon} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: 'check' | 'info' }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.tile, gap: space.sm }]}>
      <Label>{title}</Label>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name={icon} size={16} color={c.icon} strokeWidth={icon === 'check' ? 2.6 : 2} style={{ marginTop: 3 }} />
          <Body size={14} style={{ flex: 1 }}>
            {t}
          </Body>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.gutter, paddingBottom: space.xl, gap: space.md },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  card: { borderRadius: radius.card, padding: space.lg },
  step: { flexDirection: 'row', gap: space.md, borderWidth: 1, borderRadius: radius.card, padding: 14 },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodyBold },
});
