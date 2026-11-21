import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Intro } from '@/components/intro';
import { loadAppearance, useAppearanceLoaded, useColors, useScheme } from '@/lib/appearance';
import { loadSaved } from '@/lib/saved';
import { useAuth } from '@/lib/auth';
import { loadWelcomed, useWelcomed } from '@/lib/welcome';
import { fontAssets } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
loadAppearance();
loadSaved();
loadWelcomed();

function Root() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const appearanceLoaded = useAppearanceLoaded();
  const scheme = useScheme();
  const c = useColors();
  const welcomed = useWelcomed();
  // Restore the signed-in account as the app opens, so every screen knows who's signed in.
  useAuth();
  const go = appearanceLoaded && welcomed !== 'unknown' && (fontsLoaded || !!fontError);
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);

  useEffect(() => {
    if (go) SplashScreen.hideAsync().catch(() => {});
  }, [go]);

  // Keep the window behind screens the same colour so transitions never flash.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = c.bg;
      document.body.style.backgroundColor = c.bg;
    }
  }, [c.bg]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.surface, text: c.text, border: c.line, primary: c.link },
  };

  if (!go) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={intro || scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="event/[slug]" />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
        {intro ? <Intro onDone={endIntro} /> : null}
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}
