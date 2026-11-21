import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/lib/appearance';
import { countries, countryByIso, emailProblem, emailSuggestion, phoneProblem, type Country } from '@/lib/contact';
import { fonts, radius, space } from '@/theme';

import { tap } from './controls';
import { FieldError } from './form';
import { Icon } from './icons';
import { Body, Title } from './type';

/**
 * Email box that checks the address when you leave the field (and live once it has been flagged),
 * and offers "Did you mean …@gmail.com?" for common typos.
 */
export function EmailInput({
  value,
  onChange,
  error,
  label = 'Email',
  onSubmitEditing,
}: {
  value: string;
  onChange: (v: string) => void;
  /** An error from the form's own check (e.g. after pressing Continue). */
  error?: string;
  label?: string;
  onSubmitEditing?: () => void;
}) {
  const c = useColors();
  const [blurred, setBlurred] = useState(false);
  const own = blurred && value.trim() ? emailProblem(value) : null;
  const shown = error ? (emailProblem(value) ?? null) : own;
  const suggestion = emailSuggestion(value);
  const ok = !!value.trim() && !emailProblem(value) && !suggestion;
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.box, { backgroundColor: c.surface, borderColor: shown ? c.danger : c.line }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onBlur={() => setBlurred(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder="you@example.com"
          placeholderTextColor={c.text2}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          accessibilityLabel={label}
          style={[styles.input, { color: c.text }]}
        />
        {ok ? <Icon name="check" size={18} color={c.okFg} strokeWidth={2.6} /> : null}
      </View>
      {shown ? <FieldError text={shown} /> : null}
      {suggestion ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tap();
            onChange(suggestion);
          }}
          hitSlop={6}
        >
          <Body size={13} color={c.text2}>
            Did you mean <Text style={{ fontFamily: fonts.bodyBold, color: c.link }}>{suggestion}</Text>?
          </Body>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Country code button + local number. The country list opens in a searchable sheet. */
export function PhoneInput({
  country,
  number,
  onCountry,
  onNumber,
  error,
  label = 'Phone number',
}: {
  country: string;
  number: string;
  onCountry: (iso: string) => void;
  onNumber: (v: string) => void;
  error?: string;
  label?: string;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [blurred, setBlurred] = useState(false);
  const cc = countryByIso(country);
  const own = blurred && number.trim() ? phoneProblem(cc, number) : null;
  const shown = error ? phoneProblem(cc, number) : own;
  const list = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^\+/, '');
    return t ? countries.filter((x) => x.name.toLowerCase().includes(t) || x.dial.startsWith(t)) : countries;
  }, [q]);

  const choose = (x: Country) => {
    tap();
    onCountry(x.iso);
    setOpen(false);
    setQ('');
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.phoneRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country code: ${cc.name} plus ${cc.dial}`}
          accessibilityHint="Opens the list of countries"
          onPress={() => setOpen(true)}
          style={[styles.cc, { backgroundColor: c.surface, borderColor: c.line }]}
        >
          <Text style={styles.flag}>{cc.flag}</Text>
          <Text style={[styles.dial, { color: c.text }]}>+{cc.dial}</Text>
          <Icon name="chevronDown" size={16} color={c.text2} />
        </Pressable>
        <View style={[styles.box, { flex: 1, backgroundColor: c.surface, borderColor: shown ? c.danger : c.line }]}>
          <TextInput
            value={number}
            onChangeText={(v) => onNumber(v.replace(/[^\d\s]/g, ''))}
            onBlur={() => setBlurred(true)}
            placeholder={cc.iso === 'GH' ? '24 123 4567' : 'Phone number'}
            placeholderTextColor={c.text2}
            keyboardType="phone-pad"
            autoComplete="tel-national"
            textContentType="telephoneNumber"
            accessibilityLabel={label}
            maxLength={16}
            style={[styles.input, { color: c.text }]}
          />
          {number.trim() && !phoneProblem(cc, number) ? <Icon name="check" size={18} color={c.okFg} strokeWidth={2.6} /> : null}
        </View>
      </View>
      {shown ? <FieldError text={shown} /> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)} style={styles.scrim} />
        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.sheetHead}>
            <Title size={22}>Country code</Title>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setOpen(false)}>
              <Body weight="semi" color={c.link}>
                Cancel
              </Body>
            </Pressable>
          </View>
          <View style={[styles.box, { backgroundColor: c.bg, borderColor: c.line }]}>
            <Icon name="search" size={18} color={c.text2} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search country or code"
              placeholderTextColor={c.text2}
              autoCorrect={false}
              accessibilityLabel="Search countries"
              style={[styles.input, { color: c.text }]}
            />
          </View>
          <FlatList
            data={list}
            keyExtractor={(x) => x.iso}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.iso === cc.iso }}
                onPress={() => choose(item)}
                style={({ pressed }) => [styles.option, { borderColor: c.line2, backgroundColor: pressed ? c.tile : 'transparent' }]}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <Body size={15} color={c.text} style={{ flex: 1 }}>
                  {item.name}
                </Body>
                <Body size={15} weight="semi" color={c.text2}>
                  +{item.dial}
                </Body>
                {item.iso === cc.iso ? <Icon name="check" size={18} color={c.icon} strokeWidth={2.6} /> : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <Body size={14} color={c.text2} style={{ padding: space.md }}>
                No country matches “{q}”.
              </Body>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, minHeight: 48, fontFamily: fonts.body, fontSize: 16 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  cc: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: { fontSize: 20 },
  dial: { fontFamily: fonts.bodySemi, fontSize: 16 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: space.gutter,
    gap: space.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, borderBottomWidth: 1 },
});
