export interface ChildSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  batteryPercent: number | null;
  minutesToday: number;
  dailyLimitMinutes: number | null;
}

export interface FamilySummary {
  parentName: string;
  children: ChildSummary[];
  connectedCount: number;
  totalChildren: number;
  totalMinutesToday: number;
  totalLimitMinutes: number | null;
  alertsCount: number;
}
