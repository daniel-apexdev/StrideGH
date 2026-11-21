import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/lib/appearance';
import { brand, fonts, radius, touch } from '@/theme';

import { Icon, type IconName } from './icons';

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'volt' | 'outline' | 'muted';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, iconRight, disabled, style, accessibilityHint }: ButtonProps) {
  const c = useColors();
  const look = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    volt: { bg: brand.volt, fg: brand.night, border: brand.volt },
    outline: { bg: 'transparent', fg: c.text, border: c.outline },
    muted: { bg: c.neuBg, fg: c.text2, border: c.neuBg },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.button, { backgroundColor: look.bg, borderColor: look.border, opacity: pressed ? 0.85 : 1 }, style]}
    >
      {icon ? <Icon name={icon} size={18} color={look.fg} /> : null}
      <Text maxFontSizeMultiplier={1.3} style={[styles.buttonText, { color: look.fg }]}>
        {label}
      </Text>
      {iconRight ? <Icon name={iconRight} size={18} color={look.fg} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: on ? c.sel : c.surface, borderColor: on ? c.sel : c.line, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={[styles.chipText, { color: on ? c.onSel : c.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Round white button used on top of covers (back, share, save). */
export function CircleButton({
  icon,
  label,
  onPress,
  filled,
  active,
  children,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  filled?: boolean;
  active?: boolean;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        children ? styles.pill : styles.circle,
        { backgroundColor: active ? brand.volt : brand.white, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon name={icon} size={children ? 18 : 20} color={brand.night} filled={filled} strokeWidth={2.2} />
      {children}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: radius.card }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.button,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.chip, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  circle: { width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center' },
  pill: { height: touch, minWidth: touch, borderRadius: touch / 2, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
});
