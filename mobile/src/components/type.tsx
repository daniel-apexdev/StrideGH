import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useColors } from '@/lib/appearance';
import { fonts } from '@/theme';

type P = { children: ReactNode; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number };

/** Condensed uppercase headline (Barlow Condensed). */
export function Display({ children, size = 28, color, style, numberOfLines, heavy = true }: P & { size?: number; heavy?: boolean }) {
  const c = useColors();
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={1.4}
      style={[
        {
          fontFamily: heavy ? fonts.displayHeavy : fonts.display,
          fontSize: size,
          lineHeight: size * 0.98,
          color: color ?? c.text,
          textTransform: 'uppercase',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Mixed-case condensed title for card names. */
export function Title({ children, size = 21, color, style, numberOfLines }: P & { size?: number }) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={1.4}
      style={[{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.08, color: color ?? c.text }, style]}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  size = 15,
  color,
  style,
  numberOfLines,
  weight = 'regular',
}: P & { size?: number; weight?: 'regular' | 'medium' | 'semi' | 'bold' }) {
  const c = useColors();
  const family = { regular: fonts.body, medium: fonts.bodyMedium, semi: fonts.bodySemi, bold: fonts.bodyBold }[weight];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: family, fontSize: size, lineHeight: size * 1.45, color: color ?? c.body }, style]}
    >
      {children}
    </Text>
  );
}

/** Small spaced capitals for section kickers and field labels. */
export function Label({ children, color, style }: P) {
  const c = useColors();
  return <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: color ?? c.text2 }, style]}>{children}</Text>;
}
