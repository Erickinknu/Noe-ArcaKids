import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

interface AchievementRow {
  id: string;
  child_id: string;
  name: string;
  description: string;
  target_type: 'usage_minutes' | 'days_streak' | 'geofence' | 'app_block';
  target_value: number;
  achieved_at: string | null;
  created_at: string;
}

function mapAchievementRow(row: AchievementRow) {
  return {
    id: row.id,
    childId: row.child_id,
    name: row.name,
    description: row.description,
    targetType: row.target_type,
    targetValue: row.target_value,
    achievedAt: row.achieved_at ? new Date(row.achieved_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  isAchieved: boolean;
}

export const achievementRepository = {
  async getProgress(achievementId: string, currentValue: number): Promise<AchievementProgress> {
    // For now, return progress based on current value vs target
    // In a full implementation, this would query the achievement details
    const percentage = Math.round((currentValue / 100) * 100);
    const isAchieved = percentage >= 100;

    return {
      achievementId,
      currentValue,
      targetValue: 100,
      percentage,
      isAchieved,
    };
  },
};