import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { linkingService } from '@/features/linking/services/linking-service';
import { Card, errorMessage, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

type PairState = { status: 'linking' | 'invalid' | 'error'; message?: string };

export default function PairScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ code?: string }>();
  const startedRef = useRef(false);

  const [state, setState] = useState<PairState>(() => {
    const code = (params.code ?? '').trim();
    return linkingService.isValidCode(linkingService.sanitizeCode(code))
      ? { status: 'linking' }
      : { status: 'invalid' };
  });

  const runRedeem = useCallback(() => {
    const code = linkingService.sanitizeCode(params.code ?? '');
    if (!linkingService.isValidCode(code)) {
      setState({ status: 'invalid' });
      return;
    }
    setState({ status: 'linking' });
    linkingService
      .redeem(code)
      .then(() => {
        router.replace('/');
      })
      .catch((cause) => {
        setState({
          status: 'error',
          message: `${tr('arcakids.link.deepError')} ${errorMessage(cause)}`,
        });
      });
  }, [params.code, tr]);

  useEffect(() => {
    if (startedRef.current || state.status !== 'linking') return;
    startedRef.current = true;
    runRedeem();
  }, [state.status, runRedeem]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Text style={styles.title}>{tr('arcakids.link.title')}</Text>

      {state.status === 'linking' ? (
        <Card style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.info}>{tr('arcakids.link.deepLinking')}</Text>
        </Card>
      ) : state.status === 'invalid' ? (
        <Card style={styles.card}>
          <Text style={styles.error}>{tr('arcakids.link.deepFail')}</Text>
          <Button variant="outline" onPress={() => router.replace('/link')}>
            {tr('arcakids.link.manual')}
          </Button>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.error}>{state.message}</Text>
          <Button onPress={runRedeem}>{tr('arcakids.link.linkDevice')}</Button>
          <Button variant="outline" onPress={() => router.replace('/link')}>
            {tr('arcakids.link.manual')}
          </Button>
        </Card>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: spacing.lg,
      backgroundColor: colors.background,
      gap: spacing.md,
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    card: {
      gap: spacing.md,
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    info: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    error: {
      fontSize: typography.fontSizes.body,
      color: colors.danger,
      textAlign: 'center',
      lineHeight: 22,
    },
  });