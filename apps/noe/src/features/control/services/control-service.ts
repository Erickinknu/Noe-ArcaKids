import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { ValidationError } from '@noe-arcakids/shared';

import {
  appCategoryService,
  type ChildApp,
} from '../../app-categories/services/app-category-service';
import { activityService } from '../../activity/services/activity-service';
import type {
  CategoryLists,
  ChildHeader,
  ControlCategory,
  TopFreeTime,
} from '../components/control-types';

export interface CategoryLimit {
  category: ControlCategory;
  minutes: number | null;
}

export interface CategoryLimits {
  limits: CategoryLimit[];
  /** Límite de 'tiempo_libre' o null si no hay fila. */
  totalLimit: number | null;
}

const MAX_LIMIT_MINUTES = 1440;
// Misma ventana que `get_children_locations` usa para `is_online`
// (`last_seen_at > now() - interval '5 minutes'`), aplicada a `last_seen`.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const CONTROL_CATEGORIES: readonly ControlCategory[] = ['tiempo_libre', 'siempre', 'no_permitida'];

function isControlCategory(value: string): value is ControlCategory {
  return (CONTROL_CATEGORIES as readonly string[]).includes(value);
}

function assertValidLimit(minutes: number | null): void {
  if (minutes === null) return;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_LIMIT_MINUTES) {
    throw new ValidationError('El límite debe ser un entero entre 0 y 1440 minutos');
  }
}

function toRingerMode(value: unknown): ChildHeader['ringerMode'] {
  return value === 'normal' || value === 'vibrate' || value === 'silent' ? value : null;
}

async function getCategoryLists(childId: string): Promise<CategoryLists> {
  const apps: ChildApp[] = await appCategoryService.getCategories(childId);
  const lists: CategoryLists = {
    tiempoLibre: [],
    siempre: [],
    noPermitidas: [],
    sinClasificar: [],
  };
  for (const app of apps) {
    const entry = { packageName: app.packageName, appLabel: app.appLabel };
    switch (app.category as string) {
      case 'tiempo_libre':
        lists.tiempoLibre.push(entry);
        break;
      case 'siempre':
        lists.siempre.push(entry);
        break;
      case 'no_permitida':
        lists.noPermitidas.push(entry);
        break;
      default:
        // 'free' es el pozo técnico "sin clasificar" que inserta
        // sync_child_apps; cualquier valor desconocido cae aquí.
        lists.sinClasificar.push(entry);
        break;
    }
  }
  return lists;
}

async function getLimits(childId: string): Promise<CategoryLimits> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('get_category_limits', { p_child_id: childId });
  if (error) throw error;
  const rows = (data ?? []) as { category: string; daily_limit_minutes: number | null }[];
  const limits: CategoryLimit[] = rows
    .filter((row) => isControlCategory(row.category))
    .map((row) => ({
      category: row.category as ControlCategory,
      minutes: row.daily_limit_minutes ?? null,
    }));
  return {
    limits,
    totalLimit: limits.find((l) => l.category === 'tiempo_libre')?.minutes ?? null,
  };
}

// Sobrecarga de 2 args: la usa la tarjeta de tiempo libre (edita 'tiempo_libre').
// Sobrecarga de 3 args: forma general por categoría.
async function setLimit(childId: string, minutes: number | null): Promise<void>;
async function setLimit(
  childId: string,
  category: ControlCategory,
  minutes: number | null
): Promise<void>;
async function setLimit(
  childId: string,
  categoryOrMinutes: ControlCategory | number | null,
  minutes?: number | null
): Promise<void> {
  const category: ControlCategory =
    typeof categoryOrMinutes === 'string' ? categoryOrMinutes : 'tiempo_libre';
  const value = typeof categoryOrMinutes === 'string' ? (minutes ?? null) : categoryOrMinutes;
  assertValidLimit(value);
  const client = requireSupabaseClient();
  const { error } = await client.rpc('set_category_limit', {
    p_child_id: childId,
    p_category: category,
    p_daily_limit_minutes: value,
  });
  if (error) throw error;
}

/** Fija el límite de 'tiempo_libre' en 0: bloquea la lista hasta que se edite el límite. */
async function blockFreeTimeNow(childId: string): Promise<void> {
  await setLimit(childId, 'tiempo_libre', 0);
}

async function getTopFreeTime(childId: string, limit = 3): Promise<TopFreeTime> {
  const [lists, usage, limits] = await Promise.all([
    getCategoryLists(childId),
    activityService.getChildUsageByPackage(childId, 1),
    getLimits(childId),
  ]);
  const minutesByPackage = new Map(usage.packageUsages.map((u) => [u.packageName, u.minutes]));
  const ranked = lists.tiempoLibre
    .map((app) => ({
      packageName: app.packageName,
      appLabel: app.appLabel,
      minutes: minutesByPackage.get(app.packageName) ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);
  const top = ranked.slice(0, limit);
  return {
    top,
    restCount: Math.max(0, ranked.length - top.length),
    usedMinutes: ranked.reduce((sum, entry) => sum + entry.minutes, 0),
    totalLimit: limits.totalLimit,
  };
}

async function getChildHeader(childId: string): Promise<ChildHeader | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('device_status')
    .select('battery, ringer_mode, current_app, last_seen')
    .eq('child_id', childId)
    .order('last_seen', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    battery: unknown;
    ringer_mode: unknown;
    current_app: unknown;
    last_seen: unknown;
  };
  const lastSeen = typeof row.last_seen === 'string' ? row.last_seen : null;
  return {
    battery: typeof row.battery === 'number' ? row.battery : null,
    ringerMode: toRingerMode(row.ringer_mode),
    currentApp: typeof row.current_app === 'string' ? row.current_app : null,
    lastSeen,
    online: lastSeen !== null && Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS,
  };
}

export const controlService = {
  getCategoryLists,
  getLimits,
  setLimit,
  blockFreeTimeNow,
  getTopFreeTime,
  getChildHeader,
};
