import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function ChildrenScreen() {
  const { t: tr } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    const { family } = await familyService.getMyFamily();
    return childService.listChildren(family.id);
  }, []);
  const { data: children, error, loading, reload } = useAsyncData(fetchChildren);

  async function handleAdd() {
    setAdding(true);
    setActionError(null);
    try {
      const { family } = await familyService.getMyFamily();
      await childService.addChild(family.id, displayName);
      setDisplayName('');
      await reload();
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>{tr('noe.children.loading')}</Text>
      </View>
    );
  }

  if (error && !children) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{error}</Text>
        <Button variant="outline" onPress={reload}>
          {tr('common.retry')}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{tr('noe.children.title')}</Text>
      {children ? (
        <>
          {children.length === 0 ? (
            <Text style={styles.muted}>{tr('noe.children.empty')}</Text>
          ) : (
            children.map((child) => (
              <Card key={child.id}>
                <Text style={styles.childName}>{child.displayName}</Text>
                <Text style={styles.childMeta}>
                  {tr('noe.children.memberSince', {
                    date: new Date(child.createdAt).toLocaleDateString(),
                  })}
                </Text>
              </Card>
            ))
          )}
          <Card>
            <Text style={styles.cardTitle}>{tr('noe.children.addTitle')}</Text>
            <Input
              label={tr('noe.children.nameLabel')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={tr('noe.children.namePlaceholder')}
            />
            <Button
              onPress={handleAdd}
              loading={adding}
              disabled={displayName.trim().length === 0}
            >
              {tr('noe.children.add')}
            </Button>
          </Card>
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
    paddingTop: 80,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cardTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  childName: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  childMeta: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
  },
});