import { useEffect, useState, useCallback } from 'react';
import { permissionHandler, AdvancedPermission, PermissionStatus } from '@/features/permissions/permission-handler';

export interface UsePermissionReturn {
  status: PermissionStatus;
  request: () => Promise<boolean>;
  granted: boolean;
}

export function usePermission(permission: AdvancedPermission): UsePermissionReturn {
  const [status, setStatus] = useState<PermissionStatus>(PermissionStatus.UNKNOWN);

  const request = useCallback(async () => {
    const result = await permissionHandler.requestPermission(permission);
    setStatus(result.status);
    return result.granted;
  }, [permission]);

  // Check if already granted on mount
  useEffect(() => {
    let active = true;
    void permissionHandler
      .requestPermission(permission)
      .then((result) => {
        if (active) setStatus(result.status);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [permission]);

  return {
    status,
    request,
    granted: status === PermissionStatus.GRANTED,
  };
}