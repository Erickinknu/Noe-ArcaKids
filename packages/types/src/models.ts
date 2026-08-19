export type Role = 'parent' | 'child';
export type DevicePlatform = 'android' | 'ios';

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
}

export interface Device {
  id: string;
  childId: string | null;
  name: string;
  platform: DevicePlatform;
  appVersion: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  childId: string;
  deviceId: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}