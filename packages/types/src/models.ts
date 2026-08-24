export type Role = 'parent' | 'child';

export interface Family {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string | null;
  createdAt: string;
}

export interface ParentProfile {
  id: string;
  familyId: string;
  userId: string | null;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface ChildProfile {
  id: string;
  familyId: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  role: 'child';
}

export interface ParentalRules {
  id: string;
  familyId: string;
  childId: string;
  dailyLimitMinutes: number | null;
  bedtimeEnabled: boolean;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedApp {
  id: string;
  familyId: string;
  childId: string;
  packageName: string;
  appLabel: string;
  createdAt: string;
}

export interface DeviceRules {
  childId: string;
  displayName: string;
  dailyLimitMinutes: number | null;
  bedtimeEnabled: boolean;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  blockedPackages: string[];
}

export interface UsageEntry {
  packageName: string;
  minutes: number;
}

export type RestrictionReason = 'dailyLimit' | 'bedtime' | 'blockedApp' | null;