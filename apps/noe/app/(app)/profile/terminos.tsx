import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function TerminosScreen() {
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
        <Text style={styles.headerTitle}>Términos de uso</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>1. Aceptación</Text>
      <Text style={styles.body}>
        Al usar NOE y ARCA KIDS aceptas estos términos. Si no estás de acuerdo, no instales ni
        uses el servicio.
      </Text>

      <Text style={styles.sectionTitle}>2. El servicio</Text>
      <Text style={styles.body}>
        NOE permite al padre, madre o tutor legal configurar y supervisar el uso digital del
        dispositivo de un menor: límites de tiempo, bloqueo de apps, filtrado web, geocercas,
        horarios, modo de estudio, solicitudes de desbloqueo y reportes de uso. La app del menor
        (ARCA KIDS) aplica esas reglas en el dispositivo.
      </Text>

      <Text style={styles.sectionTitle}>3. Elegibilidad y cuenta</Text>
      <Text style={styles.body}>
        Solo puedes usar el servicio si eres el padre, madre o tutor legal del menor sobre cuyo
        dispositivo se instala ARCA KIDS. Eres responsable de tu cuenta, de su contraseña y de que
        la configuración respete los derechos del menor.
      </Text>

      <Text style={styles.sectionTitle}>4. Consentimiento y dispositivos</Text>
      <Text style={styles.body}>
        Al instalar ARCA KIDS autorizas que el servicio utilice accesibilidad, datos de uso, VPN de
        filtrado, administrador del dispositivo y, cuando aplique, Device Owner (modo supervisado).
        Estos permisos solo se usan para la función indicada. El menor debe estar informado de que
        el dispositivo está supervisado.
      </Text>

      <Text style={styles.sectionTitle}>5. Responsabilidad sobre el dispositivo</Text>
      <Text style={styles.body}>
        El aprovisionamiento como Device Owner o la activación de la VPN pueden modificar el
        comportamiento del dispositivo (kiosco, bloqueos, filtrado de tráfico). Algunos fabricantes
        (p. ej. MIUI o EMUI) pueden interferir con los permisos. NOE no se hace responsable de
        daños en el dispositivo derivados del uso indebido o de la desactivación por el fabricante.
      </Text>

      <Text style={styles.sectionTitle}>6. Uso aceptable</Text>
      <Text style={styles.body}>
        No uses el servicio para supervisar a personas mayores de edad ni a terceros sin
        consentimiento. No compartas códigos de emparejamiento ni credenciales fuera de tu familia.
        No intentes eludir o romper los controles de seguridad del servicio.
      </Text>

      <Text style={styles.sectionTitle}>7. Disponibilidad</Text>
      <Text style={styles.body}>
        El servicio se presta según su disponibilidad, con respaldo en proveedores de infraestructura
        de terceros. Puede haber interrupciones por mantenimiento, fallos ajenos o cambios de
        funcionalidad; procuraremos avisarte de las previsibles.
      </Text>

      <Text style={styles.sectionTitle}>8. Propiedad intelectual</Text>
      <Text style={styles.body}>
        La app, su código, marca y diseño pertenecen a su operador o cuentan con licencias
        correspondientes. No adquieres ningún derecho sobre ellos más allá del uso del servicio.
      </Text>

      <Text style={styles.sectionTitle}>9. Limitación de responsabilidad</Text>
      <Text style={styles.body}>
        El servicio se ofrece “tal cual”, sin garantías de infalibilidad: ninguna herramienta de
        control parental es absoluta. Hasta el límite permitido por la ley, el operador no será
        responsable por daños indirectos o consecuentes derivados del uso del servicio. En ningún
        caso la responsabilidad superará el importe pagado por el servicio en los 12 meses previos
        (cero durante el piloto gratuito).
      </Text>

      <Text style={styles.sectionTitle}>10. Terminación</Text>
      <Text style={styles.body}>
        Puedes eliminar tu cuenta y dejar de usar el servicio en cualquier momento. El operador
        puede suspender cuentas que incumplan estos términos o comprometan la seguridad del
        servicio, avisándote en cuanto sea razonable.
      </Text>

      <Text style={styles.sectionTitle}>11. Cambios en los términos</Text>
      <Text style={styles.body}>
        Podemos actualizar estos términos; te avisaremos de los cambios relevantes dentro de la app.
        El uso continuado tras el aviso implica aceptación de la versión vigente.
      </Text>

      <Text style={styles.sectionTitle}>12. Ley aplicable y contacto</Text>
      <Text style={styles.body}>
        Estos términos se rigen por la legislación del país de residencia del titular. Para dudas o
        reclamaciones, usa la sección “Ayuda” de la app o el correo publicado en nuestra web.
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