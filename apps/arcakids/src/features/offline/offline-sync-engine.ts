import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface OfflineAction {
  id: string;
  type: 'usage_report' | 'geofence_create' | 'geofence_update' | 'achievement_unlock' | 'settings_change';
  status: 'pending' | 'synced' | 'failed';
  payload: Record<string, any>;
  created_at: string;
  attempts: number;
  last_error?: string;
}

interface OfflineActionRow {
  id: string;
  type: string;
  status: string;
  payload: string;
  created_at: string;
  attempts: number;
  last_error?: string;
}

function mapActionRow(row: OfflineActionRow): OfflineAction {
  return {
    id: row.id,
    type: row.type as OfflineAction['type'],
    status: row.status as OfflineAction['status'],
    payload: JSON.parse(row.payload),
    created_at: row.created_at,
    attempts: row.attempts,
    last_error: row.last_error,
  };
}

export class OfflineSyncEngine {
  private readonly MAX_ATTEMPTS = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline = false;

  constructor() {
    this.setupNetworkListener();
    this.initializeSync();
  }

  private setupNetworkListener() {
    const { NetInfo } = require('@react-native-community/netinfo');

    NetInfo.addEventListener((state: { isConnected?: boolean }) => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  private initializeSync() {
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingActions();
      }
    }, this.SYNC_INTERVAL);
  }

  async queueAction(type: OfflineAction['type'], payload: Record<string, any>): Promise<OfflineAction> {
    const action: OfflineAction = {
      id: `${Date.now()}-${globalThis.crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
      type,
      status: 'pending',
      payload,
      created_at: new Date().toISOString(),
      attempts: 0,
    };

    try {
      const client = requireSupabaseClient();
      await client
        .from('offline_actions')
        .insert({
          id: action.id,
          type: action.type,
          status: 'pending',
          payload: JSON.stringify(action.payload),
          created_at: action.created_at,
          attempts: 0,
        });
      return action;
    } catch (e) {
      console.error('Failed to queue offline action:', e);
      return action;
    }
  }

  async syncPendingActions(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline) return { synced: 0, failed: 0 };

    try {
      const client = requireSupabaseClient();
      const { data, error } = await client
        .from('offline_actions')
        .select('*')
        .eq('status', 'pending');

      if (error) throw error;

      const actions = (data ?? []).map(mapActionRow);

      let synced = 0;
      let failed = 0;

      for (const action of actions) {
        try {
          await this.executeAction(action);
          // Update status to synced - using a simple approach
          await client
            .from('offline_actions')
            .update({ status: 'synced', attempts: action.attempts + 1 })
            .eq('id', action.id);
          synced++;
        } catch (e) {
          console.error(`Failed to sync action ${action.id}:`, e);
          // Mark as failed
          try {
            await client
              .from('offline_actions')
              .update({
                status: 'failed',
                attempts: action.attempts + 1,
                last_error: e instanceof Error ? e.message : String(e),
              })
              .eq('id', action.id);
          } catch (e2) {
            console.error('Failed to mark action as failed:', e2);
          }
          failed++;
        }
      }

      return { synced, failed };
    } catch (e) {
      console.error('Error during sync:', e);
      return { synced: 0, failed: 0 };
    }
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'usage_report': {
        // @ts-ignore - parental service
        await parentalService.syncUsage(action.payload.deviceUuid, {
          perApp: action.payload.perApp,
          totalMinutes: action.payload.totalMinutes,
        });
        break;
      }
      case 'geofence_create': {
        // @ts-ignore - geofence repository
        await geofenceRepository.create({
          name: action.payload.name,
          latitude: action.payload.latitude,
          longitude: action.payload.longitude,
          radius: action.payload.radius,
          childId: action.payload.childId,
        });
        break;
      }
      case 'settings_change':
        // TODO: implement settings sync
        break;
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  }

  async retryFailedActions(): Promise<{ retried: number; success: number; failed: number }> {
    try {
      const client = requireSupabaseClient();
      const { data, error } = await client
        .from('offline_actions')
        .select('*')
        .eq('status', 'failed')
        .lt('attempts', this.MAX_ATTEMPTS);

      if (error) throw error;

      const actions = (data ?? []).map(mapActionRow);
      let retried = 0;
      let success = 0;
      let stillFailed = 0;

      for (const action of actions) {
        try {
          await this.executeAction(action);
          // Update status to synced
          await client
            .from('offline_actions')
            .update({ status: 'synced', attempts: action.attempts + 1 })
            .eq('id', action.id);
          success++;
          retried++;
        } catch {
          stillFailed++;
        }
      }

      return { retried, success, failed: stillFailed };
    } catch (e) {
      console.error('Error retrying failed actions:', e);
      return { retried: 0, success: 0, failed: 0 };
    }
  }

  cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();