import { useCallback, useState } from 'react';
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
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

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
  const [blockInstalls, setBlockInstalls] = useState(false);

  const navigate = useCallback(
    (path: string) => () => router.push(path as any),
    [router],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(
      tr('noe.profile.signOut'),
      tr('noe.profile.signOutConfirm'),
      [
        { text: tr('noe.common.cancel'), style: 'cancel' },
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

  const menuItems: MenuItem[] = [
    {
      icon: 'family-restroom',
      title: 'Familia',
      subtitle: 'Gestionar miembros y niños',
      onPress: navigate('/familia'),
    },
    {
      icon: 'person',
      title: 'Perfil',
      subtitle: 'Información de tu cuenta',
      onPress: navigate('/cuenta'),
    },
    {
      icon: 'notifications',
      title: 'Notificaciones',
      subtitle: 'Ajustes de alertas y notificaciones',
      onPress: navigate('/notificaciones-ajustes'),
    },
    {
      icon: 'lock',
      title: 'Código PIN',
      subtitle: 'PIN para desbloquear el teléfono del niño',
      onPress: navigate('/pin'),
    },
    {
      icon: 'settings',
      title: 'Configuración de la app',
      subtitle: 'Tema, idioma y preferencias',
      onPress: navigate('/config'),
    },
    {
      icon: 'card-membership',
      title: 'Suscripción',
      subtitle: 'Plan actual y opciones de pago',
      onPress: navigate('/suscripcion'),
    },
    {
      icon: 'help',
      title: 'Conseguir ayuda',
      subtitle: 'Centro de soporte y preguntas frecuentes',
      onPress: navigate('/ayuda'),
    },
    {
      icon: 'lightbulb',
      title: 'Sugiere una idea',
      subtitle: 'Comparte tus ideas para mejorar NOE',
      onPress: navigate('/sugerir'),
    },
    {
      icon: 'share',
      title: 'Compartir app',
      subtitle: 'Enviar la app a otros padres',
      onPress: navigate('/compartir'),
    },
    {
      icon: 'privacy-tip',
      title: 'Política de privacidad',
      onPress: navigate('/privacidad'),
    },
    {
      icon: 'description',
      title: 'Términos de uso',
      onPress: navigate('/terminos'),
    },
  ];

  const toggleItem: ToggleItem = {
    icon: 'block',
    title: 'Bloquear instalación de nuevas apps',
    subtitle:
      'Evita que se instalen nuevas aplicaciones en el dispositivo del niño controlado por ArcaKids',
    value: blockInstalls,
    onValueChange: setBlockInstalls,
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

      {/* ── Toggle: Bloquear instalaciones ── */}
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

      {/* ── Menu items ── */}
      <View style={styles.menuGroup}>
        {menuItems.map((item, i) => (
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

      <Text style={styles.version}>NOE v0.1.0.7</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
