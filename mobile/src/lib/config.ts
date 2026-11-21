import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the Stride GH API lives (the Next.js site one folder up, under /api).
 *
 * 1. EXPO_PUBLIC_API_URL wins if set (e.g. http://192.168.1.10:3000/api
 *    or the deployed site). Put it in mobile/.env.
 * 2. In development, the phone already talks to your computer's Expo
 *    server, so we reuse that computer's LAN address on port 3000.
 * 3. Otherwise fall back to localhost (web / emulator on same machine).
 */
const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '3000';

function devHostAddress(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // older manifests
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  return host || null;
}

function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api`;
  }

  const host = devHostAddress();
  if (host) return `http://${host}:${API_PORT}/api`;

  // Android emulator reaches the host machine on 10.0.2.2
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}/api`;
  return `http://localhost:${API_PORT}/api`;
}

export const API_BASE = resolveApiBase();

/** Public website address for share links and images. Falls back to the API's host in development. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? API_BASE.replace(/\/api$/, '')).replace(/\/+$/, '');

/** Full URL for an image the website serves (e.g. "/posters/x.jpg"), or the URL itself if already absolute. */
export function siteAsset(src: string): string {
  return /^https?:\/\//.test(src) ? src : `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** Where organisers email new races when the website has no server (the GitHub Pages copy). */
export const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL?.trim() ?? '';
