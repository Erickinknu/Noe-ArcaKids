import type { AppCategory, ChildApp } from '@/features/app-categories/services/app-category-service';

export interface AppPreset {
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  category: AppCategory;
  timeLimitMinutes?: number;
  minAge?: number;
  packages: string[];
}

export const APP_PRESETS: AppPreset[] = [
  {
    key: 'web',
    label: 'Navegadores web',
    icon: 'language',
    color: '#0EA5E9',
    description: 'Recomendado: límite moderado',
    category: 'limited',
    timeLimitMinutes: 60,
    minAge: 6,
    packages: [
      'com.android.chrome',
      'com.brave.browser',
      'org.mozilla.firefox',
      'com.opera.browser',
      'com.microsoft.emmx',
      'com.duckduckgo.mobile.android',
      'com.sec.android.app.sbrowser',
    ],
  },
  {
    key: 'social',
    label: 'Redes sociales',
    icon: 'people',
    color: '#EC4899',
    description: 'Recomendado: límite corto',
    category: 'limited',
    timeLimitMinutes: 30,
    minAge: 13,
    packages: [
      'com.instagram.android',
      'com.facebook.katana',
      'com.zhiliaoapp.musically',
      'com.ss.android.ugc.aweme',
      'com.snapchat.android',
      'com.twitter.android',
      'com.linkedin.android',
      'com.pinterest',
      'com.reddit.frontpage',
      'com.sina.weibo',
      'com.tencent.mm',
    ],
  },
  {
    key: 'games',
    label: 'Juegos',
    icon: 'sports-esports',
    color: '#8B5CF6',
    description: 'Recomendado: límite moderado',
    category: 'limited',
    timeLimitMinutes: 45,
    minAge: 6,
    packages: [
      'com.mojang.minecraftpe',
      'com.mojang.minecraftedu',
      'com.roblox.client',
      'com.tencent.ig',
      'com.pubg.imobile',
      'com.dts.freefireth',
      'com.dts.freefiremax',
      'com.supercell.clashofclans',
      'com.supercell.clashroyale',
      'com.supercell.brawlstars',
      'com.supercell.boombeach',
      'com.king.candycrushsaga',
      'com.innersloth.spacemafia',
      'com.kiloo.subwaysurf',
      'com.nianticlabs.pokemongo',
      'com.epicgames.fortnite',
      'com.miHoYo.GenshinImpact',
      'com.miHoYo.hkrpg',
      'com.outfit7.mytalkingtom',
      'com.rovio.angrybirds',
      'com.robtopx.geometryjump',
      'com.mobile.legends',
      'com.ea.gp.fifamobile',
      'com.yodo1.crossyroad',
      'com.zeptolab.cuttherope',
      'com.zeptolab.cuttherope2',
      'com.imangi.templerun',
      'com.imangi.templerun2',
    ],
  },
  {
    key: 'video',
    label: 'Video y streaming',
    icon: 'play-circle',
    color: '#DC2626',
    description: 'Recomendado: límite moderado',
    category: 'limited',
    timeLimitMinutes: 60,
    minAge: 6,
    packages: [
      'com.netflix.mediaclient',
      'com.google.android.youtube',
      'com.disney.disneyplus',
      'com.crunchyroll.app',
      'com.amazon.avod.thirdpartyclient',
      'com.hbo.hbonow',
      'com.wbd.stream',
      'com.plexapp.android',
      'com.hulu.plus',
      'com.peacocktv.brick',
      'tv.twitch.android.app',
      'org.videolan.vlc',
      'com.mxtech.videoplayer.ad',
    ],
  },
  {
    key: 'music',
    label: 'Música',
    icon: 'music-note',
    color: '#059669',
    description: 'Recomendado: límite amplio',
    category: 'limited',
    timeLimitMinutes: 90,
    packages: [
      'com.spotify.music',
      'com.google.android.apps.youtube.music',
      'com.apple.android.music',
      'com.pandora.android',
      'com.soundcloud.android',
      'com.deezer.android.app',
      'com.amazon.mp3',
    ],
  },
  {
    key: 'messaging',
    label: 'Mensajería',
    icon: 'forum',
    color: '#6366F1',
    description: 'Recomendado: límite moderado',
    category: 'limited',
    timeLimitMinutes: 60,
    minAge: 9,
    packages: [
      'com.whatsapp',
      'com.google.android.apps.messaging',
      'com.facebook.orca',
      'com.telegram.messenger',
      'com.skype.raider',
      'com.discord',
      'com.slack',
    ],
  },
  {
    key: 'education',
    label: 'Educación',
    icon: 'school',
    color: '#D97706',
    description: 'Recomendado: permitir',
    category: 'free',
    minAge: 0,
    packages: [
      'com.google.android.apps.classroom',
      'org.khanacademy.android',
      'com.outthinkers.khanacademykids',
      'com.duolingo',
      'com.babbel.mobile.android',
      'pl.brainly',
      'com.quizlet.quizletandroid',
      'org.coursera.android',
      'com.udemy.android',
      'com.byjus.thelearningapp',
      'com.photomath',
      'com.google.android.apps.kids',
      'org.wikipedia',
      'org.scratchjr.android',
    ],
  },
  {
    key: 'productivity',
    label: 'Productividad',
    icon: 'work-outline',
    color: '#0D9488',
    description: 'Recomendado: permitir',
    category: 'free',
    minAge: 0,
    packages: [
      'com.google.android.apps.docs',
      'com.google.android.apps.docs.editors.docs',
      'com.google.android.apps.docs.editors.sheets',
      'com.google.android.apps.docs.editors.slides',
      'com.google.android.keep',
      'com.microsoft.office.officehub',
      'com.microsoft.office.word',
      'com.microsoft.office.excel',
      'com.microsoft.office.powerpoint',
      'com.microsoft.onenote',
      'com.microsoft.todos',
      'com.todoist',
      'com.notion.id',
      'com.evernote',
      'com.adobe.reader',
      'com.dropbox.android',
    ],
  },
  {
    key: 'shopping',
    label: 'Compras',
    icon: 'shopping-bag',
    color: '#DB2777',
    description: 'Recomendado: bloquear',
    category: 'blocked',
    minAge: 13,
    packages: [
      'com.amazon.mShop.android.shopping',
      'com.mercadolibre',
      'com.walmart.android',
      'com.ebay.mobile',
      'com.alibaba.aliexpresshd',
      'com.einnovation.temu',
    ],
  },
];

export interface PresetGroup {
  preset: AppPreset;
  apps: ChildApp[];
}

export function suggestForPresets(
  apps: ChildApp[],
  age: number | null = null
): PresetGroup[] {
  const grouped = APP_PRESETS.filter(
    (preset) => age === null || (preset.minAge ?? 0) <= age
  ).map((preset) => ({
    preset,
    apps: apps.filter((app) => preset.packages.includes(app.packageName)),
  })).filter((group) => group.apps.length > 0);

  const seen = new Set<string>();
  const deduped: PresetGroup[] = [];
  for (const group of grouped) {
    const uniqueApps = group.apps.filter((app) => {
      if (seen.has(app.packageName)) return false;
      seen.add(app.packageName);
      return true;
    });
    if (uniqueApps.length > 0) {
      deduped.push({ preset: group.preset, apps: uniqueApps });
    }
  }
  return deduped;
}

export function presetActionLabel(preset: AppPreset): string {
  if (preset.category === 'blocked') return 'Se sugiere bloquear';
  if (preset.category === 'free') return 'Se sugiere permitir';
  const minutes = preset.timeLimitMinutes ?? 60;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const duration = h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h ${m} min`;
  return `Se sugiere límite de ${duration}`;
}