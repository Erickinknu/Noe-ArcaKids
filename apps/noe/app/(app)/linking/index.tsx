import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { linkingService } from '@/features/linking/services/linking-service';
import type { PairingCode } from '@/features/linking/repositories/linking-repository';
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import type { ChildProfile } from '@noe-arcakids/types';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

interface FamilyWithChildren {
  familyId: string;
  children: ChildProfile[];
}

export default function LinkingScreen() {
  const { t: tr } = useTranslation();
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFamily = useCallback(async (): Promise<FamilyWithChildren> => {
    const { family } = await familyService.getMyFamily();
    const children = await childService.listChildren(family.id);
    return { familyId: family.id, children };
  }, []);
  const { data, error, loading, reload } = useAsyncData(fetchFamily);

  function handleSelect(child: ChildProfile) {
    setSelectedChild(child);
    setPairing(null);
    setActionError(null);
  }

  async function handleGenerate() {
    if (!data || !selectedChild) {
      return;
    }
    setGenerating(true);
    setActionError(null);
    try {
      const result = await linkingService.createPairingCode(
        data.familyId,
        selectedChild.id
      );
      setPairing(result);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('noe.linking.loading')} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.screen}>
        <ErrorState
          message={error ?? tr('noe.linking.somethingWentWrong')}
          onRetry={reload}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>{tr('noe.linking.title')}</Text>
      <Text style={styles.subtitle}>{tr('noe.linking.subtitle')}</Text>

      <Card style={styles.card}>
        <SectionHeader title={tr('noe.linking.chooseChild')} />
        {data.children.length === 0 ? (
          <EmptyState
            icon="👨‍👩‍👧"
            title={tr('noe.linking.noChildren')}
          />
        ) : (
          <View style={styles.childList}>
            {data.children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => handleSelect(child)}
                style={[styles.childRow, child.id === selectedChild?.id && styles.childSelected]}
              >
                <Text style={styles.childName}>{child.displayName}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      {selectedChild ? (
        <Button onPress={handleGenerate} loading={generating}>
          {tr('noe.linking.generateCode', { name: selectedChild.displayName })}
        </Button>
      ) : null}

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {pairing && selectedChild ? (
        <Card style={[styles.pairingCard, shadows.sm]}>
          <Text style={styles.pairingLabel}>
            {tr('noe.linking.codeFor', { name: selectedChild.displayName })}
          </Text>
          <Text style={styles.code}>{pairing.code}</Text>
          <View style={styles.qrBox}>
            <QRCode value={pairing.code} size={180} />
          </View>
          <Text style={styles.muted}>
            {tr('noe.linking.expiresAt', {
              time: new Date(pairing.expiresAt).toLocaleTimeString(),
            })}
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
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
  card: {
    ...shadows.sm,
  },
  childList: {
    gap: spacing.xs,
  },
  childRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  childName: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  pairingCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  pairingLabel: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
  code: {
    fontSize: 44,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: 8,
  },
  qrBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
    lineHeight: 20,
  },
});
