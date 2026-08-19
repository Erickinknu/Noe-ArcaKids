import { logger } from '@noe-arcakids/shared';

import { networkService } from '@/services/network-service';

export interface QueuedOperation<T = unknown> {
  id: string;
  type: string;
  payload: T;
  queuedAt: string;
}

export interface SyncService {
  isOnline(): boolean;
  queue<T>(operation: Omit<QueuedOperation<T>, 'id' | 'queuedAt'>): Promise<void>;
  flush(): Promise<void>;
  sync(): Promise<void>;
}

class StubSyncService implements SyncService {
  isOnline(): boolean {
    return networkService.isOnline();
  }

  async queue<T>(operation: Omit<QueuedOperation<T>, 'id' | 'queuedAt'>): Promise<void> {
    logger.info('Sync queue is not implemented yet', operation.type);
  }

  async flush(): Promise<void> {
    logger.info('Sync flush is not implemented yet');
  }

  async sync(): Promise<void> {
    logger.info('Sync engine is not implemented yet');
  }
}

export const syncService: SyncService = new StubSyncService();