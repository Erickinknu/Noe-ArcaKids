import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
    // @ts-ignore - expo-notifications API may vary by version
    if (permission === AdvancedPermission.POST_NOTIFICATIONS) {
      const { status: existingStatus } =
        // @ts-ignore
        Notifications.getNotificationPermissionsAsync?.() ?? {};
      let finalStatus = existingStatus ?? 'denied';

      if (finalStatus !== 'granted') {
        // @ts-ignore
        const { status } = // @ts-ignore
        Notifications.requestNotificationPermissionsAsync?.() ?? {};
        finalStatus = status ?? 'denied';
      }

      return {
        granted: finalStatus === 'granted',
        status: finalStatus === 'granted'
          ? PermissionStatus.GRANTED
          : PermissionStatus.DENIED,
      };
    }

    // @ts-ignore - usage stats permission checking is platform-specific
    if (permission === AdvancedPermission.USAGE_STATS) {
return {
      granted: false,
      status: PermissionStatus.UNKNOWN,
    } as const;
    }

    return { granted: false, status: PermissionStatus.UNKNOWN };
  }

  static async checkPermission(
    permission: AdvancedPermission
  ): Promise<PermissionStatus> {
    // @ts-ignore
    if (permission === AdvancedPermission.POST_NOTIFICATIONS) {
      // @ts-ignore
      const { status } = Notifications.getNotificationPermissionsAsync?.() ?? {};
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