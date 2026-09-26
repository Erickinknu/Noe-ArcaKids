import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function PrivacidadScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Política de privacidad</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>1. Introducción</Text>
      <Text style={styles.body}>
        NOE es un servicio de control parental formado por la app de los padres (NOE) y la app
        instalada en el dispositivo del menor (ARCA KIDS). Esta política explica qué datos
        tratamos, para qué, con qué base legal y qué derechos tienes. El titular del servicio es
        el operador de NOE. Para contactar con nosotros usa la sección “Ayuda” dentro de la app o
        el correo que publicamos en la web oficial.
      </Text>

      <Text style={styles.sectionTitle}>2. Qué datos tratamos</Text>
      <Text style={styles.body}>
        • Cuenta del padre o tutor: correo electrónico, nombre y preferencias de la app.{'\n'}
        • Perfiles de los menores: nombre, fecha de nacimiento y grupo de edad.{'\n'}
        • Dispositivo del menor: identificador de dispositivo, modelo, sistema operativo, apps
        instaladas y tiempo de uso por app.{'\n'}
        • Ubicación: solo si se activan geocercas; guardamos la entrada y salida de las zonas
        configuradas.{'\n'}
        • Navegación web: dominios visitados y si fueron bloqueados por el filtrado web.{'\n'}
        • Solicitudes de desbloqueo, alertas y eventos de política (horarios, límites, modo estudio).{'\n'}
        • Datos técnicos: tokens de notificación push y, si se activa, trazas anónimas de error
        para diagnóstico.
      </Text>

      <Text style={styles.sectionTitle}>3. Para qué los usamos y base legal</Text>
      <Text style={styles.body}>
        • Prestar el control parental que solicitas: esta es la ejecución del servicio.{'\n'}
        • Gestión de datos de menores bajo tu autorización expresa como titular parental: la base
        legal es tu consentimiento y el interés superior del menor.{'\n'}
        • Seguridad y prevención de abuso del servicio (limitación de intentos, validación de
        recuperaciones): interés legítimo del servicio.{'\n'}
        • Cumplimiento de obligaciones legales cuando aplique.
      </Text>

      <Text style={styles.sectionTitle}>4. Permisos y accesos del control parental</Text>
      <Text style={styles.body}>
        ARCA KIDS requiere permisos potentes que se usan exclusivamente para su función:{'\n'}
        • Datos de uso de aplicaciones: para medir el tiempo de uso por app.{'\n'}
        • Accesibilidad: para detectar la app en primer plano y bloquearla cuando corresponde.{'\n'}
        • VPN local: para filtrar el tráfico web del menor según las reglas configuradas.{'\n'}
        • Administrador del dispositivo / Device Owner: para bloquear, suspender o, en dispositivos
        aprovisionados, fijar la pantalla en el modo supervisado.{'\n'}
        • Ubicación en segundo plano: solo para avisarte de entradas y salidas de geocercas.{'\n'}
        • Notificaciones: para mostrarte alertas y solicitudes de desbloqueo.
      </Text>

      <Text style={styles.sectionTitle}>5. Lo que no hacemos</Text>
      <Text style={styles.body}>
        No vendemos datos personales. No usamos los datos de los menores para publicidad ni
        perfiles comerciales. No leemos conversaciones ni contenido privado.
      </Text>

      <Text style={styles.sectionTitle}>6. Con quién compartimos datos</Text>
      <Text style={styles.body}>
        • Supabase: alojamiento de la base de datos y autenticación.{'\n'}
        • Firebase Cloud Messaging: entrega de notificaciones push (solo el token necesario, no tu
        contenido).{'\n'}
        • Si se activa la monitorización de errores (Sentry), las trazas son seudonimizadas y solo
        para diagnóstico.{'\n'}
        No compartimos información con otros terceros, salvo obligación legal o autoridades
        competentes.
      </Text>

      <Text style={styles.sectionTitle}>7. Conservación</Text>
      <Text style={styles.body}>
        Conservamos los datos de tu cuenta mientras exista. Los datos de uso y actividad se
        conservan hasta 12 meses. Si eliminas tu cuenta, se eliminan los perfiles de menores y los
        datos asociados, salvo plazos de retención legal.
      </Text>

      <Text style={styles.sectionTitle}>8. Seguridad</Text>
      <Text style={styles.body}>
        Los datos viajan cifrados (TLS), el acceso a la base de datos está protegido por reglas de
        fila por familia, las contraseñas se guardan con hash seguro y el servicio limita los
        intentos de acceso para evitar abusos.
      </Text>

      <Text style={styles.sectionTitle}>9. Tus derechos</Text>
      <Text style={styles.body}>
        Puedes acceder, rectificar, suprimir, limitar el tratamiento y solicitar la portabilidad de
        tus datos, y retirar tu consentimiento en cualquier momento. Como titular parental, puedes
        ejercer estos derechos también sobre los datos de tus hijos. Para tramitarlo, usa la sección
        “Ayuda” de la app. Tienes derecho a presentar una reclamación ante tu autoridad de
        protección de datos.
      </Text>

      <Text style={styles.sectionTitle}>10. Datos de menores</Text>
      <Text style={styles.body}>
        Solo se recopilan datos de menores con la autorización de su padre, madre o tutor legal. El
        menor no crea cuenta propia ni introduce datos personales.
      </Text>

      <Text style={styles.sectionTitle}>11. Cambios y contacto</Text>
      <Text style={styles.body}>
        Podemos actualizar esta política; te avisaremos de cambios relevantes dentro de la app. La
        versión vigente será siempre la publicada aquí.
      </Text>

      <Text style={styles.footer}>Última actualización: 25 de septiembre de 2026</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  footer: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});