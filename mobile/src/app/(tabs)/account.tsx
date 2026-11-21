import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, tap } from '@/components/controls';
import { Icon } from '@/components/icons';
import { Body, Display, Label } from '@/components/type';
import { setAppearance, useAppearance, useColors, type Appearance } from '@/lib/appearance';
import { signOut, useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/config';
import { useRaces } from '@/lib/use-races';
import { resetWelcomed } from '@/lib/welcome';
import { brand, fonts, radius, space } from '@/theme';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const options: [Appearance, string][] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

export default function Account() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const choice = useAppearance();
  const races = useRaces();
  const auth = useAuth();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.gutter, paddingTop: insets.top + space.lg, gap: space.xl }}
    >
      <Display size={36}>Account</Display>

      <View style={{ gap: space.sm }}>
        <Label>APPEARANCE</Label>
        <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={[styles.segment, { backgroundColor: c.tile }]}>
          {options.map(([value, label]) => {
            const on = choice === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tap();
                  setAppearance(value);
                }}
                style={[styles.option, on && { backgroundColor: c.surface }]}
              >
                <Text style={[styles.optionText, { color: c.text }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Body size={12} color={c.text2}>
          System follows your phone&apos;s light or dark setting.
        </Body>
      </View>

      {auth.status === 'signedIn' ? (
        <View style={[styles.card, { backgroundColor: c.hero }]}>
          <Label color={brand.volt}>SIGNED IN</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(auth.user.name)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Display size={26} color={c.onHero}>
                {auth.user.name}
              </Display>
              <Body size={14} color={c.onHero2}>
                {auth.user.email}
              </Body>
              {auth.user.phone ? (
                <Body size={14} color={c.onHero2}>
                  {auth.user.phone}
                </Body>
              ) : null}
            </View>
          </View>
          <View style={styles.verified}>
            <Icon name="check" size={14} color={brand.night} strokeWidth={2.8} />
            <Text style={styles.verifiedText}>Email confirmed</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              signOut();
            }}
            style={[styles.heroOutline, { borderColor: c.heroLine, flexDirection: 'row', gap: 8 }]}
          >
            <Icon name="logout" size={18} color={c.onHero} />
            <Text style={[styles.optionText, { color: c.onHero }]}>Sign out of this phone</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: c.hero }]}>
          <Label color={brand.volt}>YOUR ACCOUNT</Label>
          <Display size={28} color={c.onHero}>
            Keep your races on every device
          </Display>
          <Body size={14} color={c.onHero2}>
            No password needed: we email you a code to create your account and to sign in on a new phone.
          </Body>
          <Button label="Create account" variant="volt" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'up' } })} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'in' } })}
            style={[styles.heroOutline, { borderColor: c.heroLine }]}
          >
            <Text style={[styles.optionText, { color: c.onHero }]}>I have an account · Sign in</Text>
          </Pressable>
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Label>ORGANISERS</Label>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/list')}
          style={({ pressed }) => [styles.row, { backgroundColor: c.ink, opacity: pressed ? 0.9 : 1 }]}
        >
          <Icon name="calendarPlus" size={22} color={brand.volt} />
          <Text style={[styles.optionText, { color: c.onInk, flex: 1 }]}>List your race</Text>
          <Icon name="arrow" size={20} color={brand.volt} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/list/submissions')}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Icon name="clock" size={22} color={c.icon} />
          <Text style={[styles.optionText, { color: c.text, flex: 1 }]}>Your submissions</Text>
          <Icon name="arrow" size={20} color={c.icon} />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => resetWelcomed()} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Body size={14} weight="semi" color={c.link}>
          Show the welcome screens again
        </Body>
      </Pressable>

      <View style={{ gap: space.xs }}>
        <Label>DEVELOPMENT</Label>
        <Body size={12} color={c.text2}>
          Race data from {API_BASE}
        </Body>
        <Body size={12} color={c.text2}>
          {races.loading
            ? 'Checking connection…'
            : races.data?.source === 'live'
              ? `Connected · ${races.data.events.length} races (live)`
              : `Not connected — using the built-in copy. ${races.data?.problem ?? ''}`}
        </Body>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.button },
  option: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  card: { borderRadius: radius.card, padding: space.gutter, gap: space.md },
  row: { minHeight: 56, borderRadius: radius.card, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: brand.volt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.displayHeavy, fontSize: 24, color: brand.night },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: brand.volt,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: { fontFamily: fonts.bodyBold, fontSize: 12, color: brand.night },
  heroOutline: { minHeight: 52, borderRadius: radius.button, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
