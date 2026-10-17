import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * URL pública del APK de ARCA KIDS (asset de GitHub Releases).
 * Se puede sobrescribir con EXPO_PUBLIC_ARCA_APK_URL al compilar.
 */
export const ARCA_KIDS_APK_URL =
  process.env.EXPO_PUBLIC_ARCA_APK_URL ??
  'https://github.com/Erickinknu/Noe-ArcaKids/releases/download/arcakids-1.4.8/ARCAKIDS-1.4.8-release.apk';

const APK_FILE_NAME = 'ARCAKIDS-noe.apk';

async function ensureLocalApk(): Promise<string> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error('No hay almacenamiento disponible en el dispositivo');
  const target = `${dir}${APK_FILE_NAME}`;
  const info = await FileSystem.getInfoAsync(target);
  if (info.exists && !info.isDirectory) return info.uri;
  const result = await FileSystem.downloadAsync(ARCA_KIDS_APK_URL, target);
  return result.uri;
}

export const appDistributionService = {
  async isAvailable(): Promise<boolean> {
    try {
      return await Sharing.isAvailableAsync();
    } catch {
      return false;
    }
  },

  /**
   * Descarga el APK de ARCA KIDS y abre la hoja de compartir del sistema
   * (WhatsApp, Bluetooth, etc.) para enviarlo al teléfono del hijo.
   */
  async shareArcaKids(): Promise<void> {
    const available = await appDistributionService.isAvailable();
    if (!available) {
      throw new Error('Compartir archivos no está disponible en este dispositivo');
    }
    const uri = await ensureLocalApk();
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.android.package-archive',
      dialogTitle: 'Enviar ARCA KIDS',
      UTI: 'com.android.package-archive',
    });
  },
};
