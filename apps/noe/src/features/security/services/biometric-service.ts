import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '@noe-arcakids/storage';

const BIOMETRIC_ENABLED_KEY = 'security/biometric_enabled';

export const biometricService = {
  async isSupported(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  },

  async isEnabled(): Promise<boolean> {
    return (await storage.get(BIOMETRIC_ENABLED_KEY)) === 'true';
  },

  async authenticate(promptMessage?: string): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage ?? 'Autentícate para desbloquear NOE',
      cancelLabel: 'Cancelar',
    });
    return result.success;
  },

  async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled) {
      const ok = await this.authenticate('Confirma tu biometría para activar el desbloqueo');
      if (!ok) return false;
      await storage.save(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    }
    await storage.save(BIOMETRIC_ENABLED_KEY, 'false');
    return true;
  },
};