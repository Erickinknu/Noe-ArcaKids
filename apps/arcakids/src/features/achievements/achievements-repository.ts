import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

export interface AchievementProgress {
  achievementId: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  targetValue: number;
  achievementType: string;
  currentValue: number;
  percentage: number;
  isAchieved: boolean;
  achievedAt: string | null;
}

interface AchievementRow {
  achievement_id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  target_value: number;
  achievement_type: string;
  current_value: number;
  achieved: boolean;
  achieved_at: string | null;
}

function mapAchievement(row: AchievementRow): AchievementProgress {
  const percentage = Math.min(Math.round((row.current_value / row.target_value) * 100), 100);
  return {
    achievementId: row.achievement_id,
    key: row.key,
    title: row.title,
    description: row.description,
    icon: row.icon,
    targetValue: row.target_value,
    achievementType: row.achievement_type,
    currentValue: row.current_value,
    percentage,
    isAchieved: row.achieved,
    achievedAt: row.achieved_at,
  };
}

export const achievementRepository = {
  async getChildAchievements(childId: string): Promise<AchievementProgress[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_child_achievements', {
      p_child_id: childId,
    });

    if (error) {
      throw new DatabaseError(error.message);
    }

    return (data ?? []).map(mapAchievement);
  },

  async incrementAchievement(
    childId: string,
    achievementKey: string,
    increment: number = 1
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('increment_achievement', {
      p_child_id: childId,
      p_achievement_key: achievementKey,
      p_increment: increment,
    });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};
