import { useEffect, useState, useCallback } from 'react';
import { useAsyncData } from '@/hooks/use-async-data';
import { identityService } from '@/features/identity/services/identity-service';

export interface UseAchievementsReturn {
  progress: {
    achievementId: string;
    currentValue: number;
    targetValue: number;
    percentage: number;
    isAchieved: boolean;
  } | null;
  reloadAchievements: () => void;
}

export function useAchievements(): UseAchievementsReturn {
  const { data: childInfo } = useAsyncData(() => identityService.getChildInfo());

  const [progress, setProgress] = useState<{
    achievementId: string;
    currentValue: number;
    targetValue: number;
    percentage: number;
    isAchieved: boolean;
  } | null>(null);

  const reloadAchievements = useCallback(() => {
    // TODO: fetch achievements from Supabase
  }, []);

  useEffect(() => {
    // Progress can be updated when child info changes
  }, [childInfo, setProgress]);

  return { progress, reloadAchievements };
}