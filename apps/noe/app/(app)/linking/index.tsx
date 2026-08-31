import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { linkingService, type LinkingMode, DEVICE_ADMIN_COMPONENT_SHORT } from '@/features/linking/services/linking-service';
import type { ProvisioningPayload } from '@noe-arcakids/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { ChildProfile } from '@noe-arcakids/types';
import { Card, errorMessage, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

interface FamilyWithChildren {
  familyId: string;
  children: ChildProfile[];
}

export default function LinkingScreen() {
  const { t: tr } = useTranslation();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [mode, setMode] = useState<LinkingMode>('child');
  const [payload, setPayload] = useState<ProvisioningPayload | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
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
    setPayload(null);
    setExpiresAt(null);
    setActionError(null);
  }

  function handleModeChange(next: LinkingMode) {
    setMode(next);
    setPayload(null);
    setExpiresAt(null);
    setActionError(null);
  }

  async function handleGenerate() {
    if (!data) return;
    // For family mode we still need a child row to bind the code against (DB constraint).
    const childForCode = selectedChild ?? data.children[0];
    if (!childForCode) {
      setActionError(tr('noe.linking.noChildren'));
      return;
    }
    setGenerating(true);
    setActionError(null);
    try {
      const result = await linkingService.createProvisioningPayload({
        familyId: data.familyId,
        childId: childForCode.id,
        mode,
      });
      setPayload(result.payload);
      setExpiresAt(result.code.expiresAt);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setGenerating(false);
    }
  }

  const qrValue = payload ? JSON.stringify(payload) : '';
  const displayChildName =
    mode === 'family' ? tr('noe.linking.modeFamily') : (selectedChild?.displayName ?? '');

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
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Text style={styles.title}>{tr('noe.linking.title')}</Text>
      <Text style={styles.subtitle}>{tr('noe.linking.subtitle')}</Text>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => handleModeChange('family')}
          style={[styles.modeChip, mode === 'family' && styles.modeChipActive]}
        >
          <Text style={[styles.modeText, mode === 'family' && styles.modeTextActive]}>{tr('noe.linking.modeFamily')}</Text>
        </Pressable>
        <Pressable
          onPress={() => handleModeChange('child')}
          style={[styles.modeChip, mode === 'child' && styles.modeChipActive]}
        >
          <Text style={[styles.modeText, mode === 'child' && styles.modeTextActive]}>{tr('noe.linking.modeChild')}</Text>
        </Pressable>
      </View>
      <Text style={styles.muted}>
        {mode === 'family' ? tr('noe.linking.modeHintFamily') : tr('noe.linking.modeHintChild')}
      </Text>

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
        {mode === 'child' && !selectedChild ? (
          <Text style={styles.hint}>{tr('noe.linking.chooseChild')}</Text>
        ) : null}
      </Card>

      <Button
        onPress={handleGenerate}
        loading={generating}
        disabled={mode === 'child' ? !selectedChild : data.children.length === 0}
      >
        {mode === 'child' && selectedChild
          ? tr('noe.linking.generateCode', { name: selectedChild.displayName })
          : tr('noe.linking.generateCode', { name: displayChildName || data.children[0]?.displayName || 'familia' })}
      </Button>

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {payload && expiresAt ? (
        <Card style={[styles.pairingCard, shadows.sm]}>
          <Text style={styles.pairingLabel}>
            {mode === 'child' && selectedChild
              ? tr('noe.linking.codeFor', { name: selectedChild.displayName })
              : tr('noe.linking.codeFor', { name: tr('noe.linking.modeFamily') })}
          </Text>
          <Text style={styles.code}>{payload.code}</Text>
          <View style={styles.qrBox}>
            <QRCode value={qrValue} size={190} />
          </View>
          <Text style={styles.muted}>
            {tr('noe.linking.expiresAt', {
              time: new Date(expiresAt).toLocaleTimeString(),
            })}
          </Text>
          <Text style={[styles.muted, styles.qrHint]}>
            {tr('noe.linking.provisioningHelp')}
          </Text>
          <Text style={styles.payloadLabel}>{tr('noe.linking.qrPayloadLabel')}</Text>
          <Text style={styles.payloadJson} selectable>{qrValue}</Text>
          <Text style={styles.muted}>
            {tr('noe.linking.adminComponentLabel', { component: DEVICE_ADMIN_COMPONENT_SHORT })}
          </Text>
          <Text style={[styles.muted, { fontSize: 10 }]}>
            {'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME = com.arcakids.child/com.arcakids.child.DeviceAdminReceiver'}
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
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
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  modeTextActive: {
    color: colors.primary,
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
  hint: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
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
    fontSize: 32,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: 6,
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
  qrHint: {
    fontStyle: 'italic',
  },
  payloadLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  payloadJson: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    width: '100%',
  },
});
