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