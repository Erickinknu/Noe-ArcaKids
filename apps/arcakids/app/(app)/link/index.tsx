import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/hooks/use-async-data';
import { linkingService } from '@/features/linking/services/linking-service';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function LinkScreen() {
  const { t: tr } = useTranslation();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const handleCode = useCallback((text: string) => {
    setCode(linkingService.sanitizeCode(text));
  }, []);

  async function handleRedeem() {
    setLinking(true);
    setError(null);
    try {
      await linkingService.redeem(code);
      setCode('');
      router.replace('/');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLinking(false);
    }
  }

  async function handleScanPress() {
    setError(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError(tr('arcakids.link.cameraPermission'));
        return;
      }
    }
    setScanning(true);
  }

  function handleBarcodeScanned(data: string) {
    if (data.length === 6 && /^\d{6}$/.test(data)) {
      setScanning(false);
      handleCode(data);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{tr('arcakids.link.title')}</Text>
      <Text style={styles.subtitle}>{tr('arcakids.link.subtitle')}</Text>

      {scanning ? (
        <Card style={styles.scannerCard}>
          <CameraView
            style={styles.scanner}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => handleBarcodeScanned(data)}
          />
          <Button variant="outline" onPress={() => setScanning(false)}>
            {tr('arcakids.link.cancelScan')}
          </Button>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>{tr('arcakids.link.enterCode')}</Text>
        <Input
          label={tr('arcakids.link.codeLabel')}
          value={code}
          onChangeText={handleCode}
          keyboardType="number-pad"
          placeholder={tr('arcakids.link.codePlaceholder')}
        />
        <Button onPress={handleRedeem} loading={linking} disabled={code.length !== 6}>
          {tr('arcakids.link.linkDevice')}
        </Button>
        <Pressable onPress={handleScanPress}>
          <Text style={styles.scanLink}>{tr('arcakids.link.scanInstead')}</Text>
        </Pressable>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 80,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 24,
  },
  cardTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scannerCard: {
    gap: spacing.md,
  },
  scanner: {
    height: 220,
    borderRadius: 12,
  },
  scanLink: {
    color: colors.primary,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
  },
});