import * as Notifications from 'expo-notifications';

export enum AdvancedPermission {
  POST_NOTIFICATIONS = 'post_notifications',
  USAGE_STATS = 'usage_stats',
}

export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNKNOWN = 'unknown',
}

export interface PermissionInfo {
  name: string;
  status: PermissionStatus;
}

export class PermissionHandler {
  async requestPermission(
    permission: AdvancedPermission
  ): Promise<{ granted: boolean; status: PermissionStatus }> {
    return await PermissionHandler.requestPermission(permission);
  }

  static async requestPermission(
    permission: AdvancedPermission
  ): Promise<{ granted: boolean; status: PermissionStatus }> {
    if (permission === AdvancedPermission.POST_NOTIFICATIONS) {
      // requestPermissionsAsync checks existing status first and only
      // prompts the OS dialog when not decided yet.
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      return {
        granted,
        status: granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED,
      };
    }

    if (permission === AdvancedPermission.USAGE_STATS) {
      // Usage stats permission checking is platform-specific.
      return {
        granted: false,
        status: PermissionStatus.UNKNOWN,
      };
    }

    return { granted: false, status: PermissionStatus.UNKNOWN };
  }

  static async checkPermission(
    permission: AdvancedPermission
  ): Promise<PermissionStatus> {
    if (permission === AdvancedPermission.POST_NOTIFICATIONS) {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted'
        ? PermissionStatus.GRANTED
        : PermissionStatus.DENIED;
    }
    return PermissionStatus.UNKNOWN;
  }

  static async requestMultiplePermissions(
    permissions: AdvancedPermission[]
  ): Promise<
    Record<
      AdvancedPermission,
      { granted: boolean; status: PermissionStatus }
    >
  > {
    const results: Record<AdvancedPermission, { granted: boolean; status: PermissionStatus }> = {} as Record<AdvancedPermission, { granted: boolean; status: PermissionStatus }>;

    for (const permission of permissions) {
      // @ts-ignore
      const { granted, status } = await this.requestPermission(permission);
      results[permission] = { granted, status };
    }

    return results;
  }
}

export const permissionHandler = new PermissionHandler();