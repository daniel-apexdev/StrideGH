/**
 * Stride GH design tokens — the same palette as the website (src/app/globals.css).
 * Deep forest, volt accent used only on dark or as a fill, off-white paper.
 */
import { Platform } from 'react-native';

export type Palette = {
  bg: string;
  surface: string;
  tile: string;
  soft: string;
  text: string;
  text2: string;
  body: string;
  line: string;
  line2: string;
  hero: string;
  hero2: string;
  heroLine: string;
  onHero: string;
  onHero2: string;
  primary: string;
  onPrimary: string;
  link: string;
  ink: string;
  onInk: string;
  onInk2: string;
  okBg: string;
  okFg: string;
  warnBg: string;
  warnFg: string;
  neuBg: string;
  neuFg: string;
  sel: string;
  onSel: string;
  navOn: string;
  navOnFg: string;
  outline: string;
  danger: string;
  icon: string;
  clay: string;
  scrim: string;
  dash: string;
};

/** Brand constants that stay the same in both modes. */
export const brand = {
  volt: '#C6F24E',
  forest: '#0E3B2C',
  night: '#111714',
  paper: '#F4F2EC',
  white: '#FFFFFF',
  muted: '#5A635E',
} as const;

export const light: Palette = {
  bg: '#F4F2EC',
  surface: '#FFFFFF',
  tile: '#E7E3D8',
  soft: '#F4F2EC',
  text: '#111714',
  text2: '#5A635E',
  body: '#2A322E',
  line: '#DEDAD0',
  line2: '#ECEAE4',
  hero: '#0E3B2C',
  hero2: '#14503C',
  heroLine: '#3C6A57',
  onHero: '#F4F2EC',
  onHero2: '#CFE0D6',
  primary: '#0E3B2C',
  onPrimary: '#F4F2EC',
  link: '#0E3B2C',
  ink: '#111714',
  onInk: '#F4F2EC',
  onInk2: '#B9C2BD',
  okBg: '#E3F0D8',
  okFg: '#1F5A2E',
  warnBg: '#FBEFD5',
  warnFg: '#7A4B00',
  neuBg: '#ECEAE4',
  neuFg: '#3E4742',
  sel: '#111714',
  onSel: '#FFFFFF',
  navOn: '#E3F0D8',
  navOnFg: '#0E3B2C',
  outline: '#111714',
  danger: '#A3341C',
  icon: '#0E3B2C',
  clay: '#7A3B22',
  scrim: 'rgba(17,23,20,0.55)',
  dash: '#B9B3A5',
};

export const dark: Palette = {
  bg: '#0B0F0D',
  surface: '#151B18',
  tile: '#1E2622',
  soft: '#1E2622',
  text: '#EEF1EE',
  text2: '#A3ADA7',
  body: '#C9D0CC',
  line: '#2A3430',
  line2: '#222B27',
  hero: '#0F2A20',
  hero2: '#163A2C',
  heroLine: '#2F5444',
  onHero: '#EEF1EE',
  onHero2: '#B7CCBF',
  primary: '#C6F24E',
  onPrimary: '#111714',
  link: '#C6F24E',
  ink: '#1E2622',
  onInk: '#EEF1EE',
  onInk2: '#A3ADA7',
  okBg: '#17301F',
  okFg: '#9FD9A8',
  warnBg: '#3A2A0C',
  warnFg: '#F2C46B',
  neuBg: '#232B27',
  neuFg: '#C9D0CC',
  sel: '#EEF1EE',
  onSel: '#111714',
  navOn: '#23331F',
  navOnFg: '#C6F24E',
  outline: '#EEF1EE',
  danger: '#FF8A70',
  icon: '#C6F24E',
  clay: '#E39A78',
  scrim: 'rgba(0,0,0,0.65)',
  dash: '#3E4A44',
};

export const fonts = {
  display: 'Barlow-Bold',
  displayHeavy: 'Barlow-ExtraBold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemi: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
} as const;

export const fontAssets = {
  [fonts.display]: require('@expo-google-fonts/barlow-condensed/700Bold/BarlowCondensed_700Bold.ttf'),
  [fonts.displayHeavy]: require('@expo-google-fonts/barlow-condensed/800ExtraBold/BarlowCondensed_800ExtraBold.ttf'),
  [fonts.body]: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  [fonts.bodyMedium]: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  [fonts.bodySemi]: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  [fonts.bodyBold]: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  chip: 999,
  card: 14,
  button: 12,
  tile: 10,
} as const;

/** Minimum touch target on both platforms. */
export const touch = 44;

export const isWeb = Platform.OS === 'web';
