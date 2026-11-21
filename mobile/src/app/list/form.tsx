import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, tap } from '@/components/controls';
import { EmailInput, PhoneInput } from '@/components/contact-fields';
import { DateField, TimeField } from '@/components/date-picker';
import { Checkbox, Choices, Field, FieldError, Input } from '@/components/form';
import { Icon } from '@/components/icons';
import { Body, Display, Label, Title } from '@/components/type';
import { ApiError, api } from '@/lib/api';
import { useColors } from '@/lib/appearance';
import { currentAuth } from '@/lib/auth';
import { countryByIso, formatPhone, parsePhone } from '@/lib/contact';
import { dmy } from '@/lib/dates';
import { clearDraft, loadDraft, rememberMine, saveDraft } from '@/lib/listing';
import { distanceCategories, formatStartTime, todayISO } from '@/lib/races';
import {
  categoryLabels,
  checkStep,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  draftToInput,
  emptyDistance,
  emptyDraft,
  ghanaRegions,
  guessCategory,
  includedOptions,
  organiserRoles,
  prettyDate,
  raceTypes,
  registrationMethods,
  stepOf,
  steps,
  validDate,
  type DistanceDraft,
  type FormDraft,
} from '@/lib/submission';
import { brand, fonts, radius, space } from '@/theme';

const MAX_W = 560;
const LAST = steps.length - 1;

export default function ListForm() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<FormDraft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [resubmit, setResubmit] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; email: string } | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const today = todayISO();

  useEffect(() => {
    loadDraft().then((d) => {
      const auth = currentAuth();
      if (d) {
        setDraft(d.draft);
        setStep(Math.min(d.step, LAST));
        setResubmit(d.resubmit);
      } else if (auth.status === 'signedIn') {
        // Start "About you" with the signed-in account's details.
        const phone = auth.user.phone ? parsePhone(auth.user.phone) : null;
        setDraft({
          ...emptyDraft(),
          contactName: auth.user.name,
          email: auth.user.email,
          phoneCountry: phone?.country.iso ?? 'GH',
          phone: phone?.number ?? '',
        });
      }
      setReady(true);
    });
  }, []);

  // Save as they go, so leaving the screen (or the app) never loses answers.
  useEffect(() => {
    if (!ready || done) return;
    const t = setTimeout(() => saveDraft({ draft, step, resubmit }), 500);
    return () => clearTimeout(t);
  }, [draft, step, resubmit, ready, done]);

  // Once someone has tried to continue, re-check the step as they type so fixed fields lose their red.
  const update = (fn: (d: FormDraft) => FormDraft) => {
    const nd = fn(draft);
    setDraft(nd);
    if (Object.keys(errors).length) setErrors(checkStep(step, nd, today));
  };
  const set = <K extends keyof FormDraft>(k: K, v: FormDraft[K]) => update((d) => ({ ...d, [k]: v }));
  const setDistance = (i: number, patch: Partial<DistanceDraft>) =>
    update((d) => ({ ...d, distances: d.distances.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const err = (k: string) => errors[k];

  const goTo = (n: number) => {
    setStep(n);
    setProblem(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const next = () => {
    const e = checkStep(step, draft, today);
    setErrors(e);
    if (Object.keys(e).length) return;
    goTo(step + 1);
  };

  const back = () => (step === 0 ? close() : goTo(step - 1));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/list'));

  const submit = async () => {
    // Check every step before sending; jump to the first one that needs attention.
    for (let s = 0; s <= LAST; s++) {
      const e = checkStep(s, draft, today);
      if (Object.keys(e).length) {
        setErrors(e);
        if (s !== step) goTo(s);
        else scroll.current?.scrollToEnd({ animated: true });
        return;
      }
    }
    setBusy(true);
    setProblem(null);
    try {
      const input = draftToInput(draft);
      const { submission } = resubmit ? await api.resubmit(resubmit, input) : await api.submit(input);
      const email = draft.email.trim().toLowerCase();
      rememberMine({ reference: submission.reference, email, name: draft.name.trim(), sentAt: new Date().toISOString() });
      await clearDraft();
      setDone({ reference: submission.reference, email });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        setErrors(e.fields);
        goTo(Math.min(...Object.keys(e.fields).map(stepOf)));
        setProblem(e.message);
      } else {
        setProblem(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.icon} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.done, { backgroundColor: c.hero, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={{ width: '100%', maxWidth: MAX_W, gap: space.lg }}>
          <View style={styles.tick}>
            <Icon name="check" size={30} color={brand.night} strokeWidth={2.8} />
          </View>
          <Display size={44} color={c.onHero}>
            {resubmit ? 'Changes sent' : 'Race submitted'}
          </Display>
          <Body color={c.onHero2}>
            We’ll check the details against your official page, usually within 2 working days. Check progress any time in Your submissions
            with this reference.
          </Body>
          <View style={{ gap: 6 }}>
            <Label color={c.onHero2}>YOUR REFERENCE</Label>
            <View style={styles.ref}>
              <Text selectable style={styles.refText}>
                {done.reference}
              </Text>
            </View>
          </View>
          <Button label="Track this submission" variant="volt" onPress={() => router.replace('/list/submissions')} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.dismissTo('/account')}
            style={[styles.heroOutline, { borderColor: c.heroLine }]}
          >
            <Text style={[styles.btnText, { color: c.onHero }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const d = draft;
  const shown = Object.keys(errors).filter((k) => stepOf(k) === step || (k === 'consent' && step === LAST));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header: close, progress */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm, borderColor: c.line, backgroundColor: c.bg }]}>
        <View style={[styles.headerRow, { maxWidth: MAX_W }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close and keep your answers"
            onPress={close}
            hitSlop={8}
            style={[styles.close, { borderColor: c.line, backgroundColor: c.surface }]}
          >
            <Icon name="x" size={20} color={c.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <Label>
              {resubmit ? `EDITING ${resubmit} · ` : ''}STEP {step + 1} OF {steps.length}
            </Label>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 1, max: steps.length, now: step + 1 }}
              style={[styles.track, { backgroundColor: c.tile }]}
            >
              <View style={[styles.fill, { width: `${((step + 1) / steps.length) * 100}%`, backgroundColor: c.primary }]} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxl, alignItems: 'center' }}
      >
        <View style={{ width: '100%', maxWidth: MAX_W, gap: space.lg }}>
          <Display size={36}>{steps[step]}</Display>

          {step === 0 ? (
            <>
              <Field label="Race name" error={err('race.name')}>
                <Input
                  value={d.name}
                  onChangeText={(v) => set('name', v)}
                  placeholder="e.g. Labadi Beach 10K"
                  maxLength={80}
                  invalid={!!err('race.name')}
                  accessibilityLabel="Race name"
                />
              </Field>
              <Field label="Kind of race" error={err('race.type')}>
                <Choices label="Kind of race" options={raceTypes} value={d.type} onToggle={(v) => set('type', v)} />
              </Field>
              <Field
                label="Describe the race"
                hint={`Tip: write at least ${DESCRIPTION_MIN} characters to continue — after that, as much as you like. Cover the route, the atmosphere, who it’s for and any cause it supports.`}
                error={err('race.description')}
              >
                <Input
                  multiline
                  value={d.description}
                  onChangeText={(v) => set('description', v)}
                  maxLength={DESCRIPTION_MAX}
                  invalid={!!err('race.description')}
                  accessibilityLabel="Race description"
                />
                <DescriptionCount length={d.description.trim().length} />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <View style={styles.row}>
                <View style={{ flex: 1.25 }}>
                  <Field label="Race date" error={err('when.date')}>
                    <DateField label="Race date" value={d.date} onChange={(v) => set('date', v)} min={today} invalid={!!err('when.date')} />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Start time" error={err('when.startTime')}>
                    <TimeField
                      label="Start time"
                      value={d.startTime}
                      onChange={(v) => set('startTime', v)}
                      invalid={!!err('when.startTime')}
                    />
                  </Field>
                </View>
              </View>
              {prettyDate(d.date) ? (
                <Body size={13} weight="semi" color={c.link}>
                  {prettyDate(d.date)}
                  {d.startTime.length === 5 ? ` · ${formatStartTime(d.startTime)}` : ''}
                </Body>
              ) : null}
              <Field label="Start venue or meeting point" hint="Where runners should go on race morning." error={err('when.venue')}>
                <Input
                  value={d.venue}
                  onChangeText={(v) => set('venue', v)}
                  placeholder="e.g. Independence Square"
                  invalid={!!err('when.venue')}
                  accessibilityLabel="Venue"
                />
              </Field>
              <Field label="Town or city" error={err('when.city')}>
                <Input
                  value={d.city}
                  onChangeText={(v) => set('city', v)}
                  placeholder="e.g. Accra"
                  invalid={!!err('when.city')}
                  accessibilityLabel="Town or city"
                />
              </Field>
              <Field label="Region" error={err('when.region')}>
                <Choices
                  label="Region"
                  options={ghanaRegions.map((r) => [r, r] as const)}
                  value={d.region}
                  onToggle={(v) => set('region', v)}
                />
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              {d.distances.map((x, i) => (
                <View key={i} style={[styles.box, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <View style={styles.boxHead}>
                    <Label>DISTANCE {i + 1}</Label>
                    {d.distances.length > 1 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove distance ${i + 1}`}
                        hitSlop={10}
                        onPress={() =>
                          set(
                            'distances',
                            d.distances.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <Body size={13} weight="bold" color={c.danger}>
                          Remove
                        </Body>
                      </Pressable>
                    ) : null}
                  </View>
                  <Field label="Name" error={err(`distances.${i}.label`)}>
                    <Input
                      value={x.label}
                      onChangeText={(v) => setDistance(i, { label: v, category: guessCategory(v) })}
                      placeholder="e.g. 10K"
                      maxLength={40}
                      invalid={!!err(`distances.${i}.label`)}
                      accessibilityLabel={`Distance ${i + 1} name`}
                    />
                  </Field>
                  <Field label="Category">
                    <Choices
                      label="Category"
                      options={distanceCategories.map((k) => [k, categoryLabels[k]] as const)}
                      value={x.category}
                      onToggle={(v) => setDistance(i, { category: v })}
                    />
                  </Field>
                  <Field label="Entry fee (GHS)" hint="Leave blank if it isn’t decided yet." error={err(`distances.${i}.fee`)}>
                    <View style={{ gap: space.sm }}>
                      <Input
                        style={{ opacity: x.free ? 0.5 : 1 }}
                        editable={!x.free}
                        value={x.free ? '' : x.fee}
                        onChangeText={(v) => setDistance(i, { fee: v })}
                        placeholder={x.free ? 'Free' : 'e.g. 150'}
                        keyboardType="decimal-pad"
                        invalid={!!err(`distances.${i}.fee`)}
                        accessibilityLabel={`Distance ${i + 1} fee in cedis`}
                      />
                      <Checkbox checked={x.free} onChange={(v) => setDistance(i, { free: v })}>
                        <Body weight="semi" color={c.text} style={{ marginTop: 1 }}>
                          Free entry
                        </Body>
                      </Checkbox>
                    </View>
                  </Field>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Field label="Places" error={err(`distances.${i}.capacity`)}>
                        <Input
                          value={x.capacity}
                          onChangeText={(v) => setDistance(i, { capacity: v })}
                          placeholder="Optional"
                          keyboardType="number-pad"
                          invalid={!!err(`distances.${i}.capacity`)}
                          accessibilityLabel="Number of places"
                        />
                      </Field>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Cut-off">
                        <Input
                          value={x.cutoff}
                          onChangeText={(v) => setDistance(i, { cutoff: v })}
                          placeholder="e.g. 3 hours"
                          maxLength={40}
                          accessibilityLabel="Cut-off time"
                        />
                      </Field>
                    </View>
                  </View>
                </View>
              ))}
              {d.distances.length < 10 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    tap();
                    set('distances', [...d.distances, emptyDistance()]);
                  }}
                  style={[styles.add, { borderColor: c.dash }]}
                >
                  <Body weight="bold" color={c.link}>
                    + Add another distance
                  </Body>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field label="Runners get" hint="Tick everything that comes with entry.">
                <Choices
                  label="Included with entry"
                  options={includedOptions}
                  value={d.included}
                  onToggle={(v) => set('included', d.included.includes(v) ? d.included.filter((x) => x !== v) : [...d.included, v])}
                />
              </Field>
              <Field label="Anything else? (optional)">
                <Input
                  value={d.includedOther}
                  onChangeText={(v) => set('includedOther', v)}
                  placeholder="e.g. Post-race breakfast and music"
                  maxLength={200}
                  accessibilityLabel="Anything else included"
                />
              </Field>
              <Field label="Minimum age (optional)" error={err('requirements.minAge')}>
                <Input
                  value={d.minAge}
                  onChangeText={(v) => set('minAge', v)}
                  placeholder="e.g. 12"
                  keyboardType="number-pad"
                  maxLength={3}
                  invalid={!!err('requirements.minAge')}
                  accessibilityLabel="Minimum age"
                />
              </Field>
              <Field label="Walkers welcome?">
                <Choices
                  label="Walkers welcome"
                  options={[
                    ['yes', 'Yes, walkers welcome'],
                    ['no', 'No, runners only'],
                  ]}
                  value={d.walkersWelcome}
                  onToggle={(v) => set('walkersWelcome', d.walkersWelcome === v ? '' : v)}
                />
              </Field>
              <Field label="Other requirements (optional)" hint="e.g. medical form for the marathon, under-16s need a parent.">
                <Input
                  value={d.requirementNotes}
                  onChangeText={(v) => set('requirementNotes', v)}
                  maxLength={300}
                  accessibilityLabel="Other requirements"
                />
              </Field>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Field label="How do runners register?">
                <Choices
                  label="Registration method"
                  options={registrationMethods}
                  value={d.regMethod}
                  onToggle={(v) => set('regMethod', v)}
                />
              </Field>
              {d.regMethod !== 'not_open' ? (
                <Field
                  label={d.regMethod === 'url' ? 'Registration link' : d.regMethod === 'ussd' ? 'USSD code' : 'Phone or WhatsApp number'}
                  hint={d.regMethod === 'url' ? 'Runners are sent here to sign up and pay.' : undefined}
                  error={err('registration.value')}
                >
                  <Input
                    value={d.regValue}
                    onChangeText={(v) => set('regValue', v)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={d.regMethod === 'url' ? 'url' : 'phone-pad'}
                    placeholder={d.regMethod === 'url' ? 'https://' : d.regMethod === 'ussd' ? 'e.g. *713*123#' : 'e.g. 024 000 0000'}
                    invalid={!!err('registration.value')}
                    accessibilityLabel="Registration details"
                  />
                </Field>
              ) : null}
              <Field
                label="Registration closes"
                hint="Your best date for now. If it might move, tick the box and tell us when it changes."
                error={err('registration.deadline')}
              >
                <DateField
                  label="Registration closes"
                  value={d.regDeadline}
                  onChange={(v) => set('regDeadline', v)}
                  min={today}
                  max={validDate(d.date) ? d.date : undefined}
                  invalid={!!err('registration.deadline')}
                />
                {prettyDate(d.regDeadline) ? (
                  <Body size={13} weight="semi" color={c.link}>
                    {prettyDate(d.regDeadline)}
                  </Body>
                ) : null}
                <Checkbox checked={d.regDeadlineMayChange} onChange={(v) => set('regDeadlineMayChange', v)}>
                  <Body size={14} color={c.text}>
                    This date may change
                  </Body>
                </Checkbox>
              </Field>
              <Field
                label="Official page, poster or social post"
                hint="A link that shows the race details, so we can check them. Instagram, Facebook, X or your website all work."
              >
                <Input
                  value={d.posterLink}
                  onChangeText={(v) => set('posterLink', v)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://"
                  accessibilityLabel="Link to official page or poster"
                />
              </Field>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <Field label="Organiser" hint="The club, company or group putting on the race." error={err('organiser.organisation')}>
                <Input
                  value={d.organisation}
                  onChangeText={(v) => set('organisation', v)}
                  invalid={!!err('organiser.organisation')}
                  accessibilityLabel="Organiser"
                />
              </Field>
              <Field label="Your name" error={err('organiser.contactName')}>
                <Input
                  value={d.contactName}
                  onChangeText={(v) => set('contactName', v)}
                  autoComplete="name"
                  textContentType="name"
                  invalid={!!err('organiser.contactName')}
                  accessibilityLabel="Your name"
                />
              </Field>
              <Field label="Your connection to the race" error={err('organiser.role')}>
                <Choices label="Your connection to the race" options={organiserRoles} value={d.role} onToggle={(v) => set('role', v)} />
              </Field>
              <Field label="Email" hint="Only the review team sees this. We use it to contact you about the listing.">
                <EmailInput value={d.email} onChange={(v) => set('email', v)} error={err('organiser.email')} />
              </Field>
              <Field label="Phone or WhatsApp">
                <PhoneInput
                  label="Phone or WhatsApp"
                  country={d.phoneCountry}
                  number={d.phone}
                  onCountry={(v) => set('phoneCountry', v)}
                  onNumber={(v) => set('phone', v)}
                  error={err('organiser.phone')}
                />
              </Field>
              <Field label="Instagram, Facebook or website (optional)">
                <Input
                  value={d.social}
                  onChangeText={(v) => set('social', v)}
                  autoCapitalize="none"
                  placeholder="@yourclub"
                  accessibilityLabel="Social account or website"
                />
              </Field>
            </>
          ) : null}

          {step === LAST ? <Review draft={d} onEdit={goTo} /> : null}

          {step === LAST ? (
            <View style={[styles.box, { backgroundColor: c.soft, borderColor: c.line }]}>
              <Checkbox checked={d.consent} onChange={(v) => set('consent', v)}>
                <Body size={14}>
                  The details are accurate, and I’m allowed to share them. I understand Stride GH reviews every race before it goes live.
                </Body>
              </Checkbox>
              {err('consent') ? <FieldError text={err('consent')} /> : null}
            </View>
          ) : null}

          {shown.length > 0 && step !== LAST ? (
            <Body size={13} weight="semi" color={c.warnFg} style={[styles.note, { backgroundColor: c.warnBg }]}>
              A few details need another look — they’re marked in red.
            </Body>
          ) : null}
          {problem ? (
            <Body size={13} weight="semi" color={c.warnFg} style={[styles.note, { backgroundColor: c.warnBg }]}>
              {problem}
            </Body>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, borderColor: c.line, backgroundColor: c.surface }]}>
        <View style={[styles.headerRow, { maxWidth: MAX_W }]}>
          <Button label={step === 0 ? 'Cancel' : 'Back'} variant="outline" onPress={back} style={{ flex: 1 }} />
          {step < LAST ? (
            <Button label={step === LAST - 1 ? 'Check details' : 'Continue'} onPress={next} style={{ flex: 2 }} />
          ) : (
            <Button
              label={busy ? 'Sending…' : resubmit ? 'Send changes' : 'Submit for review'}
              onPress={submit}
              disabled={busy}
              style={{ flex: 2 }}
            />
          )}
        </View>
        <Body size={11} color={c.text2} style={{ textAlign: 'center', marginTop: 6 }}>
          Your answers are saved on this phone as you go.
        </Body>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Counts up to the minimum, then just shows the length. */
function DescriptionCount({ length }: { length: number }) {
  const c = useColors();
  const left = DESCRIPTION_MIN - length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
      {left <= 0 ? <Icon name="check" size={14} color={c.okFg} strokeWidth={2.6} /> : null}
      <Body size={12} weight={left <= 0 ? 'semi' : 'regular'} color={left <= 0 ? c.okFg : c.text2}>
        {left > 0 ? `${length}/${DESCRIPTION_MIN} — ${left} more to go` : `${length.toLocaleString('en-GB')} characters`}
      </Body>
    </View>
  );
}

function Review({ draft: d, onEdit }: { draft: FormDraft; onEdit: (step: number) => void }) {
  const c = useColors();
  const regLabel = registrationMethods.find(([m]) => m === d.regMethod)?.[1] ?? '';
  const fee = (x: DistanceDraft) => (x.free ? 'Free' : x.fee ? `GHS ${x.fee}` : 'Fee not decided');
  return (
    <View style={{ gap: space.md }}>
      <Body size={14} color={c.text2}>
        Check everything before sending. Tap Edit to change a section.
      </Body>
      <Section title="The race" onEdit={() => onEdit(0)}>
        <Title size={22}>{d.name}</Title>
        <Body size={13} color={c.text2}>
          {raceTypes.find(([t]) => t === d.type)?.[1]}
        </Body>
        <Body size={14} numberOfLines={4}>
          {d.description}
        </Body>
      </Section>
      <Section title="When & where" onEdit={() => onEdit(1)}>
        <Body size={14} weight="semi" color={c.text}>
          {prettyDate(d.date)}
          {d.startTime ? ` · ${formatStartTime(d.startTime)}` : ''}
        </Body>
        <Body size={14}>
          {d.venue}, {d.city} · {d.region}
        </Body>
      </Section>
      <Section title="Distances & fees" onEdit={() => onEdit(2)}>
        {d.distances.map((x, i) => (
          <View key={i} style={styles.reviewRow}>
            <Body size={14} weight="bold" color={c.text}>
              {x.label}
            </Body>
            <Body size={14}>{fee(x)}</Body>
          </View>
        ))}
      </Section>
      <Section title="What's included" onEdit={() => onEdit(3)}>
        <Body size={14}>
          {[...d.included.map((k) => includedOptions.find(([o]) => o === k)?.[1]), d.includedOther].filter(Boolean).join(', ') ||
            'Nothing listed'}
        </Body>
        <Body size={13} color={c.text2}>
          {[
            d.minAge ? `Minimum age ${d.minAge}` : null,
            d.walkersWelcome === 'yes' ? 'Walkers welcome' : d.walkersWelcome === 'no' ? 'Runners only' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Body>
      </Section>
      <Section title="Registration" onEdit={() => onEdit(4)}>
        <Body size={14}>
          {regLabel}
          {d.regMethod !== 'not_open' && d.regValue ? `: ${d.regValue}` : ''}
        </Body>
        {d.regDeadline ? (
          <Body size={13} color={c.text2}>
            Closes {dmy(d.regDeadline)}
            {d.regDeadlineMayChange ? ' (may change)' : ''}
          </Body>
        ) : null}
      </Section>
      <Section title="About you" onEdit={() => onEdit(5)}>
        <Body size={14} weight="semi" color={c.text}>
          {d.organisation}
        </Body>
        <Body size={14}>
          {d.contactName} · {d.email} · {d.phone ? formatPhone(countryByIso(d.phoneCountry), d.phone) : ''}
        </Body>
      </Section>
    </View>
  );
}

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.box, { backgroundColor: c.surface, borderColor: c.line, gap: 4 }]}>
      <View style={styles.boxHead}>
        <Label>{title.toUpperCase()}</Label>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title}`} hitSlop={12} onPress={onEdit}>
          <Body size={13} weight="bold" color={c.link}>
            Edit
          </Body>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.gutter, paddingBottom: space.md, borderBottomWidth: 1, alignItems: 'center' },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: space.md },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  row: { flexDirection: 'row', gap: space.md },
  box: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.md },
  boxHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  add: {
    minHeight: 50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { padding: space.md, borderRadius: radius.button, overflow: 'hidden' },
  footer: { paddingHorizontal: space.gutter, paddingTop: space.md, borderTopWidth: 1, alignItems: 'center' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  done: { flex: 1, paddingHorizontal: space.gutter, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 60, height: 60, borderRadius: 30, backgroundColor: brand.volt, alignItems: 'center', justifyContent: 'center' },
  ref: { alignSelf: 'flex-start', backgroundColor: brand.volt, borderRadius: radius.button, paddingHorizontal: 16, paddingVertical: 8 },
  refText: { fontFamily: fonts.displayHeavy, fontSize: 34, letterSpacing: 1.5, color: brand.night },
  heroOutline: { minHeight: 52, borderWidth: 1.5, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
