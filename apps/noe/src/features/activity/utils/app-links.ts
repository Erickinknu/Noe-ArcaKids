import { APP_PRESETS } from '@/features/app-categories/constants/app-presets';

export function appPlayStoreUrl(packageName: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}`;
}

export function appWebSearchUrl(label: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${label} app`)}`;
}

export interface AppCategoryInfo {
  key: string;
  label: string;
  icon: string;
  color: string;
}

const PACKAGE_TO_CATEGORY = new Map<string, AppCategoryInfo>();
for (const preset of APP_PRESETS) {
  for (const packageName of preset.packages) {
    PACKAGE_TO_CATEGORY.set(packageName, {
      key: preset.key,
      label: preset.label,
      icon: preset.icon,
      color: preset.color,
    });
  }
}

export function categoryForPackage(packageName: string): AppCategoryInfo | null {
  return PACKAGE_TO_CATEGORY.get(packageName) ?? null;
}

const FRIENDLY_NAMES: Record<string, string> = {
  'com.android.chrome': 'Chrome',
  'com.brave.browser': 'Brave',
  'org.mozilla.firefox': 'Firefox',
  'com.opera.browser': 'Opera',
  'com.microsoft.emmx': 'Edge',
  'com.duckduckgo.mobile.android': 'DuckDuckGo',
  'com.google.android.youtube': 'YouTube',
  'com.google.android.apps.youtube.music': 'YouTube Music',
  'com.instagram.android': 'Instagram',
  'com.facebook.katana': 'Facebook',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.snapchat.android': 'Snapchat',
  'com.twitter.android': 'Twitter',
  'com.linkedin.android': 'LinkedIn',
  'com.pinterest': 'Pinterest',
  'com.reddit.frontpage': 'Reddit',
  'com.whatsapp': 'WhatsApp',
  'com.google.android.apps.messaging': 'Mensajes',
  'com.facebook.orca': 'Messenger',
  'com.telegram.messenger': 'Telegram',
  'com.google.android.apps.photos': 'Fotos',
  'com.netflix.mediaclient': 'Netflix',
  'com.spotify.music': 'Spotify',
  'com.google.android.apps.maps': 'Maps',
  'com.google.android.gm': 'Gmail',
  'com.mojang.minecraftpe': 'Minecraft',
  'com.roblox.client': 'Roblox',
  'com.supercell.clashofclans': 'Clash of Clans',
  'com.duolingo': 'Duolingo',
  'org.khanacademy.android': 'Khan Academy',
  'com.google.android.apps.kids': 'Google Kids',
  'org.wikipedia': 'Wikipedia',
};

export function friendlyAppName(packageName: string, appLabel?: string | null): string {
  const label = appLabel?.trim();
  if (label) return label;
  return FRIENDLY_NAMES[packageName] ?? packageName.split('.').pop() ?? packageName;
}