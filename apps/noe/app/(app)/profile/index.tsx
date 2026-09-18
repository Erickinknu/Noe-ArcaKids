import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  Switch,
  View,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { authService } from '@/features/auth/services/auth-service';
import { familyService } from '@/features/family/services/family-service';
import { profileService } from '@/features/profile/services/profile-service';
import { APP_VERSION } from '@noe-arcakids/config';
import { useAsyncData, useRandomVerse, useTheme, VerseBanner, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

interface MenuItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

interface ToggleItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  color?: string;
}

export default function OtrosScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [blockInstalls, setBlockInstalls] = useState(false);
  const footerVerse = useRandomVerse(['gratitude', 'wisdom']);

  const fetchBlockSetting = useCallback(async (): Promise<boolean> => {
    const my = await familyService.getMyFamily();
    if (!my.profile.id) return false;
    return profileService.getBlockInstalls(my.profile.id);
  }, []);
  useAsyncData<boolean>(fetchBlockSetting, setBlockInstalls);

  async function handleBlockInstallsChange(value: boolean) {
    setBlockInstalls(value);
    try {
      const my = await familyService.getMyFamily();
      if (my.profile.id) {
        await profileService.updateBlockInstalls(my.profile.id, value);
      }
    } catch {
      setBlockInstalls(!value);
    }
  }

  const navigate = useCallback(
    (path: string) => () => router.push(path as any),
    [router],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(
      tr('noe.profile.signOut'),
      tr('noe.profile.signOutConfirm'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('noe.profile.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch {}
          },
        },
      ],
    );
  }, [tr]);

  const sections: { key: string; title: string; items: MenuItem[] }[] = [
    {
      key: 'account',
      title: 'Cuenta · Familia',
      items: [
        {
          icon: 'family-restroom',
          title: 'Familia',
          subtitle: 'Gestionar miembros y niños',
          onPress: navigate('/profile/familia'),
        },
        {
          icon: 'person',
          title: 'Perfil',
          subtitle: 'Información de tu cuenta',
          onPress: navigate('/profile/cuenta'),
        },
      ],
    },
    {
      key: 'security',
      title: 'Seguridad',
      items: [
        {
          icon: 'lock',
          title: 'Código PIN',
          subtitle: 'PIN para bloquear el acceso a NOE con contraseña',
          onPress: navigate('/profile/pin'),
        },
        {
          icon: 'settings',
          title: 'Configuración de la app',
          subtitle: 'Tema, idioma y seguridad',
          onPress: navigate('/profile/config'),
        },
      ],
    },
    {
      key: 'notifications',
      title: 'Notificaciones',
      items: [
        {
          icon: 'notifications',
          title: 'Notificaciones',
          subtitle: 'Ajustes de alertas y notificaciones',
          onPress: navigate('/profile/notifications'),
        },
      ],
    },
    {
      key: 'support',
      title: 'Plan y soporte',
      items: [
        {
          icon: 'card-membership',
          title: 'Suscripción',
          subtitle: 'Plan actual y opciones de pago',
          onPress: navigate('/profile/suscripcion'),
        },
        {
          icon: 'help',
          title: 'Conseguir ayuda',
          subtitle: 'Centro de soporte y preguntas frecuentes',
          onPress: navigate('/profile/ayuda'),
        },
        {
          icon: 'lightbulb',
          title: 'Sugiere una idea',
          subtitle: 'Comparte tus ideas para mejorar NOE',
          onPress: navigate('/profile/sugerir'),
        },
        {
          icon: 'share',
          title: 'Compartir app',
          subtitle: 'Enviar la app a otros padres',
          onPress: navigate('/profile/compartir'),
        },
      ],
    },
    {
      key: 'legal',
      title: 'Legal',
      items: [
        {
          icon: 'privacy-tip',
          title: 'Política de privacidad',
          onPress: navigate('/profile/privacidad'),
        },
        {
          icon: 'description',
          title: 'Términos de uso',
          onPress: navigate('/profile/terminos'),
        },
      ],
    },
  ];

  const toggleItem: ToggleItem = {
    icon: 'block',
    title: 'Bloquear instalación de nuevas apps',
    subtitle:
      'Evita que se instalen nuevas aplicaciones en el dispositivo del niño controlado por ArcaKids',
    value: blockInstalls,
    onValueChange: handleBlockInstallsChange,
    color: colors.danger,
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: screenPadding.paddingTop },
      ]}
    >
      <Text style={styles.headerTitle}>Otros</Text>

      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          {section.key === 'security' ? (
            <View style={styles.toggleCard}>
              <View style={styles.toggleLeft}>
                <MaterialIcons
                  name={toggleItem.icon}
                  size={22}
                  color={toggleItem.color ?? colors.primary}
                />
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleTitle}>{toggleItem.title}</Text>
                  <Text style={styles.toggleSubtitle}>{toggleItem.subtitle}</Text>
                </View>
              </View>
              <Switch
                value={toggleItem.value}
                onValueChange={toggleItem.onValueChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          ) : null}

          <View style={styles.menuGroup}>
            {section.items.map((item) => (
              <Pressable
                key={item.title}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={item.onPress}
              >
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={item.danger ? colors.danger : colors.primary}
                />
                <View style={styles.menuTextGroup}>
                  <Text
                    style={[
                      styles.menuTitle,
                      item.danger && { color: colors.danger },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* ── Sign out ── */}
      <Pressable
        style={({ pressed }) => [
          styles.dangerButton,
          pressed && styles.dangerButtonPressed,
        ]}
        onPress={handleSignOut}
      >
        <MaterialIcons name="logout" size={20} color={colors.danger} />
        <Text style={styles.dangerButtonText}>
          {tr('noe.profile.signOut')}
        </Text>
      </Pressable>

      {footerVerse ? <VerseBanner verse={footerVerse} /> : null}

      <Text style={styles.version}>NOE v{APP_VERSION}</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  /* ── Toggle card ── */
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  toggleTextGroup: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  toggleSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },

  /* ── Menu group ── */
  menuGroup: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  menuItemPressed: {
    backgroundColor: colors.surface,
  },
  menuTextGroup: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },

  /* ── Danger button ── */
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: spacing.sm,
  },
  dangerButtonPressed: {
    backgroundColor: '#fef2f2',
  },
  dangerButtonText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.danger,
  },

  version: {
    textAlign: 'center',
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
