import i18next from 'i18next';

import type { ChildSummary, FamilySummary } from '../types';
import { dashboardRepository } from '../repositories/dashboard-repository';

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function relativeTime(isoString: string | null): string {
  if (!isoString) return i18next.t('common.never');
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return i18next.t('common.justNow');
  if (minutes < 60) return i18next.t('common.minutesAgo', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18next.t('common.hoursAgo', { hours });
  const days = Math.floor(hours / 24);
  return i18next.t('common.daysAgo', { days });
}

export const dashboardService = {
  getFamilySummary(): Promise<FamilySummary> {
    return dashboardRepository.getFamilySummary();
  },

  getConnectedCount(children: ChildSummary[]): number {
    return children.filter((c) => c.isOnline).length;
  },

  getTotalMinutesToday(children: ChildSummary[]): number {
    return children.reduce((sum, c) => sum + c.minutesToday, 0);
  },
};
