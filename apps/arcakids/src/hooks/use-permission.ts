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
    void request();
  }, [request]);

  return {
    status,
    request,
    granted: status === PermissionStatus.GRANTED,
  };
}