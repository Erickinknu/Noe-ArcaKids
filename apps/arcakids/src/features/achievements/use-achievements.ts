import { useCallback, useEffect, useState } from 'react';
import { useAsyncData } from '@noe-arcakids/shared';
import { identityService } from '@/features/identity/services/identity-service';
import {
  achievementRepository,
  type AchievementProgress,
} from './achievements-repository';

export interface UseAchievementsReturn {
  achievements: AchievementProgress[];
  totalAchieved: number;
  totalAvailable: number;
  loading: boolean;
  error: string | null;
  reloadAchievements: () => void;
}

export function useAchievements(): UseAchievementsReturn {
  const { data: childInfo } = useAsyncData(() => identityService.getChildInfo());
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!childInfo?.childId) {
      setAchievements([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await achievementRepository.getChildAchievements(childInfo.childId);
      setAchievements(data);
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar logros');
    } finally {
      setLoading(false);
    }
  }, [childInfo]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchAchievements());
  }, [fetchAchievements]);

  const totalAchieved = achievements.filter((a) => a.isAchieved).length;

  return {
    achievements,
    totalAchieved,
    totalAvailable: achievements.length,
    loading,
    error,
    reloadAchievements: fetchAchievements,
  };
}
