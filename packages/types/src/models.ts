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

// ── Device Owner remote control (FASE 10) ──

export type DeviceCommandType =
  | 'LOCK'
  | 'UNLOCK'
  | 'BLOCK_APPS'
  | 'UNBLOCK_APPS'
  | 'SET_POLICY'
  | 'REQUEST_LOCATION';

export type DeviceCommandStatus = 'pending' | 'executed' | 'failed' | 'expired';

export interface DeviceCommand {
  id: string;
  deviceUuid: string;
  familyId: string;
  childId: string | null;
  command: DeviceCommandType;
  payload: Record<string, unknown> | null;
  status: DeviceCommandStatus;
  createdAt: string;
  executedAt: string | null;
}

export interface DevicePolicy {
  id: string;
  familyId: string;
  childId: string | null;
  deviceUuid: string;
  dailyLimitMinutes: number | null;
  bedtimeEnabled: boolean;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  blockedPackages: string[];
  updatedAt: string;
}

export interface DeviceStatus {
  deviceUuid: string;
  familyId: string | null;
  childId: string | null;
  lastSeen: string | null;
  battery: number | null;
  latitude: number | null;
  longitude: number | null;
  currentApp: string | null;
  isLocked: boolean;
}

export interface ProvisioningPayload {
  type: 'provision';
  familyId: string;
  childId?: string | null;
  code: string;
  timestamp: string;
  devicePolicy?: Partial<DevicePolicy> | null;
  androidAdminComponent?: string;
  /** Extra consumed by QR provisioning intent (Device Owner flow) */
  provisioningExtras?: {
    deviceAdminComponentName: string;
    familyId: string;
    childId?: string;
    pairingCode: string;
  };
}

export interface DeviceOwnerState {
  isDeviceOwner: boolean;
  isAdminActive: boolean;
  canSuspendPackages: boolean;
}

// ── Geofencing (FASE 5) ──

export interface Geofence {
  id: string;
  familyId: string;
  childId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  enabled: boolean;
  createdAt: string;
  triggered?: boolean;
  triggeredAt?: number | null;
}

export interface GeofenceEvent {
  geofenceId: string;
  childId: string;
  type: 'enter' | 'exit';
  timestamp: string;
  latitude: number;
  longitude: number;
}

// ── Push & Unlock (FASE 6) ──

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'android' | 'ios';
  createdAt: string;
}

export interface UnlockRequest {
  id: string;
  childId: string;
  childName: string | null;
  familyId: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  resolvedAt: string | null;
}