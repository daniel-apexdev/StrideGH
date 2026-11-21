import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useColors } from '@/lib/appearance';
import { fonts, radius } from '@/theme';

import { tap } from './controls';
import { Icon } from './icons';
import { Body } from './type';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      {hint ? (
        <Body size={12} color={c.text2} style={{ marginTop: -4 }}>
          {hint}
        </Body>
      ) : null}
      {children}
      {error ? <FieldError text={error} /> : null}
    </View>
  );
}

export function FieldError({ text }: { text: string }) {
  const c = useColors();
  return (
    <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: c.danger }}>
      {text}
    </Text>
  );
}

export function Input({ invalid, style, multiline, ...rest }: TextInputProps & { invalid?: boolean }) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.text2}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...rest}
      style={[
        styles.input,
        multiline && { minHeight: 132, paddingTop: 12, paddingBottom: 12 },
        { color: c.text, backgroundColor: c.surface, borderColor: invalid ? c.danger : c.line },
        style,
      ]}
    />
  );
}

/** A wrap of pill buttons for picking one (or several) options. */
export function Choices<T extends string>({
  options,
  value,
  onToggle,
  label,
}: {
  options: readonly (readonly [T, string])[];
  value: T | T[] | '';
  onToggle: (v: T) => void;
  label: string;
}) {
  const c = useColors();
  const multi = Array.isArray(value);
  return (
    <View accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={label} style={styles.wrap}>
      {options.map(([v, text]) => {
        const on = multi ? value.includes(v) : value === v;
        return (
          <Pressable
            key={v}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: on } : { selected: on }}
            onPress={() => {
              tap();
              onToggle(v);
            }}
            style={({ pressed }) => [
              styles.choice,
              { backgroundColor: on ? c.sel : c.surface, borderColor: on ? c.sel : c.line, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {multi && on ? <Icon name="check" size={15} color={c.onSel} strokeWidth={2.6} /> : null}
            <Text maxFontSizeMultiplier={1.3} style={[styles.choiceText, { color: on ? c.onSel : c.text }]}>
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        tap();
        onChange(!checked);
      }}
      style={styles.checkRow}
    >
      <View style={[styles.box, { borderColor: checked ? c.primary : c.outline, backgroundColor: checked ? c.primary : 'transparent' }]}>
        {checked ? <Icon name="check" size={15} color={c.onPrimary} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodyBold, fontSize: 14 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: radius.button, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  choiceText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44, paddingVertical: 4 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
