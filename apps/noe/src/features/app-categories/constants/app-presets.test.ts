import {
  APP_PRESETS,
  suggestForPresets,
  presetActionLabel,
} from '@/features/app-categories/constants/app-presets';
import type { ChildApp } from '@/features/app-categories/services/app-category-service';

function app(overrides: Partial<ChildApp>): ChildApp {
  return {
    id: 'id-' + overrides.packageName,
    packageName: overrides.packageName ?? 'com.example',
    appLabel: overrides.appLabel ?? 'App',
    category: overrides.category ?? 'free',
    timeLimitMinutes: overrides.timeLimitMinutes ?? null,
  };
}

describe('APP_PRESETS', () => {
  it('define un catálogo no vacío con paquetes únicos', () => {
    expect(APP_PRESETS.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const preset of APP_PRESETS) {
      expect(preset.packages.length).toBeGreaterThan(0);
      for (const pkg of preset.packages) {
        expect(seen.has(pkg)).toBe(false);
        seen.add(pkg);
      }
    }
  });

  it('siempre propone una categoría válida', () => {
    for (const preset of APP_PRESETS) {
      expect(['limited', 'blocked', 'free']).toContain(preset.category);
      if (preset.category === 'limited') {
        expect(preset.timeLimitMinutes).toBeGreaterThan(0);
      }
    }
  });
});

describe('suggestForPresets', () => {
  it('agrupa las apps instaladas por preset y deduplica paquetes', () => {
    const apps: ChildApp[] = [
      app({ packageName: 'com.instagram.android', appLabel: 'Instagram' }),
      app({ packageName: 'com.roblox.client', appLabel: 'Roblox' }),
      app({ packageName: 'com.supercell.clashofclans', appLabel: 'CoC' }),
      app({ packageName: 'com.desconocida.app', appLabel: 'Otra' }),
    ];
    const groups = suggestForPresets(apps);
    const social = groups.find((g) => g.preset.key === 'social');
    const games = groups.find((g) => g.preset.key === 'games');
    expect(social?.apps.map((a) => a.packageName)).toEqual(['com.instagram.android']);
    expect(games?.apps.length).toBe(2);
  });

  it('no sugiere nada si no hay apps conocidas', () => {
    const groups = suggestForPresets([app({ packageName: 'com.desconocida.app' })]);
    expect(groups).toHaveLength(0);
  });

  it('filtra presets por la edad del niño', () => {
    const apps: ChildApp[] = [
      app({ packageName: 'com.instagram.android', appLabel: 'Instagram' }),
      app({ packageName: 'com.duolingo', appLabel: 'Duolingo' }),
      app({ packageName: 'com.roblox.client', appLabel: 'Roblox' }),
    ];
    const forPreschool = suggestForPresets(apps, 4);
    expect(forPreschool.some((g) => g.preset.key === 'social')).toBe(false);
    expect(forPreschool.some((g) => g.preset.key === 'games')).toBe(false);
    expect(forPreschool.some((g) => g.preset.key === 'education')).toBe(true);

    const forTeen = suggestForPresets(apps, 14);
    expect(forTeen.some((g) => g.preset.key === 'social')).toBe(true);

    const withoutAge = suggestForPresets(apps, null);
    expect(withoutAge.some((g) => g.preset.key === 'social')).toBe(true);
  });
});

describe('presetActionLabel', () => {
  it('describe la acción sugerida por categoría', () => {
    const limited = APP_PRESETS.find((p) => p.category === 'limited')!;
    expect(presetActionLabel(limited)).toContain('Se sugiere límite');
    const blocked = APP_PRESETS.find((p) => p.category === 'blocked')!;
    expect(presetActionLabel(blocked)).toBe('Se sugiere bloquear');
    const free = APP_PRESETS.find((p) => p.category === 'free')!;
    expect(presetActionLabel(free)).toBe('Se sugiere permitir');
  });
});