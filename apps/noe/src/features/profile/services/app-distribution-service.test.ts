import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { appDistributionService, ARCA_KIDS_APK_URL } from './app-distribution-service';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const fileSystem = FileSystem as unknown as {
  getInfoAsync: jest.Mock;
  downloadAsync: jest.Mock;
};
const sharing = Sharing as unknown as {
  isAvailableAsync: jest.Mock;
  shareAsync: jest.Mock;
};

const APK_URI = 'file:///cache/ARCAKIDS-noe.apk';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('appDistributionService.shareArcaKids', () => {
  it('throws when the platform cannot share files', async () => {
    sharing.isAvailableAsync.mockResolvedValue(false);

    await expect(appDistributionService.shareArcaKids()).rejects.toThrow(
      /no está disponible/
    );
    expect(sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('downloads the APK then opens the share sheet when not cached', async () => {
    sharing.isAvailableAsync.mockResolvedValue(true);
    fileSystem.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: APK_URI });
    fileSystem.downloadAsync.mockResolvedValue({ uri: APK_URI, status: 200 });

    await appDistributionService.shareArcaKids();

    expect(fileSystem.downloadAsync).toHaveBeenCalledWith(ARCA_KIDS_APK_URL, APK_URI);
    expect(sharing.shareAsync).toHaveBeenCalledWith(
      APK_URI,
      expect.objectContaining({ mimeType: 'application/vnd.android.package-archive' })
    );
  });

  it('reuses a cached APK without downloading it again', async () => {
    sharing.isAvailableAsync.mockResolvedValue(true);
    fileSystem.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, uri: APK_URI });

    await appDistributionService.shareArcaKids();

    expect(fileSystem.downloadAsync).not.toHaveBeenCalled();
    expect(sharing.shareAsync).toHaveBeenCalledWith(APK_URI, expect.any(Object));
  });
});
