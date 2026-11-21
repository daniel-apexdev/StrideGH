import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmailInput, PhoneInput } from '@/components/contact-fields';
import { Button, tap } from '@/components/controls';
import { Field, FieldError, Input } from '@/components/form';
import { Icon } from '@/components/icons';
import { LogoMark } from '@/components/logo';
import { Body, Display, Label } from '@/components/type';
import { ApiError, api, type AuthStart } from '@/lib/api';
import { useColors } from '@/lib/appearance';
import { signedIn } from '@/lib/auth';
import { countryByIso, emailProblem, formatPhone, phoneProblem } from '@/lib/contact';
import { fonts, radius, space } from '@/theme';

const MAX_W = 480;

/**
 * Create account / sign in, without passwords.
 * 1. Details (create: name, email, phone · sign in: email) → we email a 6-digit code.
 * 2. Enter the code → the email is confirmed and this phone stays signed in.
 */
export default function SignIn() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: 'in' | 'up' }>();
  const [mode, setMode] = useState<'in' | 'up'>(params.mode === 'up' ? 'up' : 'in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('GH');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ text: string; action?: 'switch' } | null>(null);
  const [sent, setSent] = useState<AuthStart | null>(null);

  const nameErr = tried && mode === 'up' && name.trim().length < 2 ? 'Enter your name' : undefined;
  const emailErr = tried ? (emailProblem(email) ?? undefined) : undefined;
  const phoneErr = tried && mode === 'up' ? (phoneProblem(countryByIso(phoneCountry), phone) ?? undefined) : undefined;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  const switchMode = (m: 'in' | 'up') => {
    tap();
    setMode(m);
    setTried(false);
    setProblem(null);
  };

  const send = async () => {
    setTried(true);
    setProblem(null);
    const bad = emailProblem(email) || (mode === 'up' && (name.trim().length < 2 || phoneProblem(countryByIso(phoneCountry), phone)));
    if (bad) return;
    setBusy(true);
    try {
      const res = await api.authStart(
        mode === 'up'
          ? { mode: 'signup', name: name.trim(), email: email.trim(), phone: formatPhone(countryByIso(phoneCountry), phone) }
          : { mode: 'signin', email: email.trim() },
      );
      setSent(res);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'account_exists' || e.code === 'no_account'))
        setProblem({ text: e.message, action: 'switch' });
      else setProblem({ text: e instanceof Error ? e.message : 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: space.gutter,
          alignItems: 'center',
        }}
      >
        <View style={{ width: '100%', maxWidth: MAX_W, gap: space.lg }}>
          <View style={styles.topRow}>
            <LogoMark size={44} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              hitSlop={8}
              style={[styles.close, { backgroundColor: c.surface, borderColor: c.line }]}
            >
              <Icon name="x" size={20} color={c.text} />
            </Pressable>
          </View>

          {sent ? (
            <CodeStep
              start={sent}
              onBack={() => setSent(null)}
              onResent={setSent}
              resend={() =>
                api.authStart(
                  mode === 'up'
                    ? { mode: 'signup', name: name.trim(), email: email.trim(), phone: formatPhone(countryByIso(phoneCountry), phone) }
                    : { mode: 'signin', email: email.trim() },
                )
              }
              onDone={close}
            />
          ) : (
            <>
              <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: c.tile }]}>
                {(
                  [
                    ['up', 'Create account'],
                    ['in', 'Sign in'],
                  ] as const
                ).map(([m, label]) => (
                  <Pressable
                    key={m}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === m }}
                    onPress={() => switchMode(m)}
                    style={[styles.segmentBtn, mode === m && { backgroundColor: c.surface }]}
                  >
                    <Text style={[styles.segmentText, { color: c.text }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ gap: 6 }}>
                <Display size={36}>{mode === 'up' ? 'Join Stride GH' : 'Welcome back'}</Display>
                <Body color={c.text2}>
                  {mode === 'up'
                    ? 'No password to remember. We’ll email you a 6-digit code to confirm it’s you.'
                    : 'Enter the email you signed up with and we’ll send you a 6-digit code.'}
                </Body>
              </View>

              {mode === 'up' ? (
                <Field label="Name" error={nameErr}>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    autoComplete="name"
                    textContentType="name"
                    invalid={!!nameErr}
                    accessibilityLabel="Name"
                  />
                </Field>
              ) : null}

              <Field label="Email">
                <EmailInput value={email} onChange={setEmail} error={emailErr} onSubmitEditing={mode === 'in' ? send : undefined} />
              </Field>

              {mode === 'up' ? (
                <Field
                  label="Phone number"
                  hint="So race organisers and shops can reach you about orders later. We won’t share it without asking."
                >
                  <PhoneInput country={phoneCountry} number={phone} onCountry={setPhoneCountry} onNumber={setPhone} error={phoneErr} />
                </Field>
              ) : null}

              {problem ? (
                <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: c.warnBg }]}>
                  <Icon name="info" size={18} color={c.warnFg} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Body size={14} color={c.warnFg}>
                      {problem.text}
                    </Body>
                    {problem.action === 'switch' ? (
                      <Pressable accessibilityRole="button" onPress={() => switchMode(mode === 'up' ? 'in' : 'up')} hitSlop={6}>
                        <Body size={14} weight="bold" color={c.warnFg} style={{ textDecorationLine: 'underline' }}>
                          {mode === 'up' ? 'Sign in instead' : 'Create an account'}
                        </Body>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <Button label={busy ? 'Sending code…' : 'Email me a code'} icon="mail" onPress={send} disabled={busy} />
              <Body size={12} color={c.text2} style={{ textAlign: 'center' }}>
                You can keep browsing races and saving them without an account.
              </Body>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Six boxes backed by one hidden input, so paste and the keyboard's code suggestion both work. */
function CodeStep({
  start,
  onBack,
  onResent,
  resend,
  onDone,
}: {
  start: AuthStart;
  onBack: () => void;
  onResent: (s: AuthStart) => void;
  resend: () => Promise<AuthStart>;
  onDone: () => void;
}) {
  const c = useColors();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(start.resendIn);
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.authVerify(start.email, value);
      await signedIn(res.token, res.user);
      setWelcome(res.isNew ? `Welcome to Stride GH, ${res.user.name.split(' ')[0]}!` : `Welcome back, ${res.user.name.split(' ')[0]}!`);
      setTimeout(onDone, 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const again = async () => {
    setError(null);
    try {
      const res = await resend();
      onResent(res);
      setWait(res.resendIn);
      setCode('');
    } catch (e) {
      if (e instanceof ApiError && typeof e.extra.resendIn === 'number') setWait(e.extra.resendIn);
      setError(e instanceof Error ? e.message : 'Couldn’t send a new code.');
    }
  };

  if (welcome) {
    return (
      <View accessibilityLiveRegion="polite" style={{ gap: space.md, alignItems: 'flex-start', paddingTop: space.xl }}>
        <View style={[styles.tick, { backgroundColor: c.primary }]}>
          <Icon name="check" size={28} color={c.onPrimary} strokeWidth={2.8} />
        </View>
        <Display size={36}>{welcome}</Display>
        <Body color={c.text2}>Your email is confirmed and you’re signed in on this phone.</Body>
      </View>
    );
  }

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: 6 }}>
        <Label>STEP 2 OF 2</Label>
        <Display size={36}>Check your email</Display>
        <Body color={c.text2}>
          We sent a 6-digit code to <Text style={{ fontFamily: fonts.bodyBold, color: c.text }}>{start.email}</Text>. It works for{' '}
          {start.expiresInMinutes} minutes. Check your spam folder if it isn’t there.
        </Body>
      </View>

      {start.devCode ? (
        <View style={[styles.notice, { backgroundColor: c.neuBg }]}>
          <Icon name="info" size={18} color={c.neuFg} />
          <Body size={13} color={c.neuFg} style={{ flex: 1 }}>
            Test mode: email isn’t set up on the website yet, so the code is shown here and in the website’s terminal:{' '}
            <Text style={{ fontFamily: fonts.bodyBold }}>{start.devCode}</Text>
          </Body>
        </View>
      ) : null}

      <Pressable accessibilityLabel="Enter the 6-digit code" onPress={() => input.current?.focus()} style={styles.boxes}>
        {Array.from({ length: 6 }, (_, i) => {
          const active = i === Math.min(code.length, 5);
          return (
            <View
              key={i}
              style={[
                styles.digit,
                { backgroundColor: c.surface, borderColor: error ? c.danger : active ? c.primary : c.line, borderWidth: active ? 2 : 1 },
              ]}
            >
              <Text style={[styles.digitText, { color: c.text }]}>{code[i] ?? ''}</Text>
            </View>
          );
        })}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, '').slice(0, 6);
            setCode(digits);
            if (digits.length === 6) verify(digits);
          }}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          accessibilityLabel="6-digit code"
          caretHidden
          style={styles.hidden}
        />
      </Pressable>
      {error ? <FieldError text={error} /> : null}

      <Button label={busy ? 'Checking…' : 'Confirm'} onPress={() => verify(code)} disabled={busy || code.length !== 6} />

      <View style={styles.links}>
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
          <Body size={14} weight="semi" color={c.link}>
            Change email
          </Body>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: wait > 0 }} disabled={wait > 0} onPress={again} hitSlop={8}>
          <Body size={14} weight="semi" color={wait > 0 ? c.text2 : c.link}>
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </Body>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.button },
  segmentBtn: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  notice: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.card },
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  digit: { flex: 1, aspectRatio: 0.82, maxWidth: 60, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  digitText: { fontFamily: fonts.displayHeavy, fontSize: 30 },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.md },
  tick: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
