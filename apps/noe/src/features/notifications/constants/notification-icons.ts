import { MaterialIcons } from '@expo/vector-icons';
import type { NotificationType } from '@noe-arcakids/types';

export const NOTIFICATION_ICON: Record<NotificationType, keyof typeof MaterialIcons.glyphMap> = {
  unlock_request: 'lock-open',
  sos: 'warning',
  offline: 'wifi-off',
  time_goal: 'timer',
  system: 'notifications',
};
