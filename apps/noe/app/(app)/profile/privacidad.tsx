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

      <Text style={styles.sectionTitle}>1. Responsable del tratamiento</Text>
      <Text style={styles.body}>
        [RAZÓN_SOCIAL], con RUC [RUC] y domicilio en [CIUDAD_ECUADOR], Ecuador, es la
        responsable del tratamiento de los datos personales recogidos a través de NOE (app de
        padres y tutores) y ARCA KIDS (app del menor). Para cualquier consulta sobre esta
        política puedes escribirnos a [EMAIL_SOPORTE] o usar la sección “Ayuda” dentro de la
        app. Trataremos tus datos con calidez, transparencia y respeto a tu vida familiar.
      </Text>

      <Text style={styles.sectionTitle}>2. Datos que recogemos</Text>
      <Text style={styles.body}>
        • Cuenta del padre, madre o tutor: correo electrónico, nombre y preferencias de la app.{'\n'}
        • Perfiles de los menores: nombre, fecha de nacimiento y grupo de edad.{'\n'}
        • Dispositivo del menor: identificador de dispositivo, modelo, sistema operativo, apps
        instaladas y tiempo de uso por app.{'\n'}
        • Ubicación: únicamente si activas las geocercas; registramos entradas y salidas de las
        zonas que configuras.{'\n'}
        • Navegación web: dominios visitados y si fueron bloqueados por el filtrado web.{'\n'}
        • Solicitudes de desbloqueo, alertas y eventos de política (horarios, límites, modo de
        estudio).{'\n'}
        • Datos técnicos: tokens de notificación push y, si se activa, trazas seudonimizadas de
        error para diagnóstico.
      </Text>

      <Text style={styles.sectionTitle}>3. Finalidad del tratamiento</Text>
      <Text style={styles.body}>
        Utilizamos tus datos exclusivamente para: (a) prestar el servicio de acompañamiento y
        control parental que solicitas; (b) aplicar las reglas que configuras en el dispositivo
        del menor; (c) enviarte alertas, solicitudes de desbloqueo y reportes de uso; (d)
        garantizar la seguridad del servicio y prevenir abusos; y (e) cumplir nuestras
        obligaciones legales. Nunca usaremos los datos de tus hijos para publicidad ni para
        perfiles comerciales, y no leemos conversaciones ni contenido privado.
      </Text>

      <Text style={styles.sectionTitle}>4. Base legal y Ley Orgánica de Protección de Datos Personales del Ecuador</Text>
      <Text style={styles.body}>
        Tratamos tus datos conforme a la Ley Orgánica de Protección de Datos Personales del
        Ecuador (LOPDP) y su reglamento. Nuestras bases legitimadoras son: la ejecución del
        contrato de servicio que aceptas al usar NOE, tu consentimiento libre, informado y
        específico —en particular como padre, madre o tutor para el tratamiento de los datos
        de tus hijos menores de edad, atendiendo a su interés superior—, y nuestro interés
        legítimo en mantener la seguridad del servicio. Solo recogemos datos de menores con la
        autorización de su representante legal; el menor no crea cuenta propia.
      </Text>

      <Text style={styles.sectionTitle}>5. Derechos ARCO y cómo ejercerlos</Text>
      <Text style={styles.body}>
        Tienes derecho a Acceder, Rectificar, Cancelar (suprimir) y Oponerte al tratamiento de
        tus datos, así como a la portabilidad y a retirar tu consentimiento en cualquier
        momento. Como titular parental, puedes ejercer estos derechos también sobre los datos
        de tus hijos. Para hacerlo, escríbenos a [EMAIL_SOPORTE] indicando tu nombre, tu
        relación con el menor y el derecho que deseas ejercer; te responderemos dentro de los
        plazos previstos en la LOPDP. También tienes derecho a presentar un reclamo ante la
        Superintendencia de Protección de Datos del Ecuador.
      </Text>

      <Text style={styles.sectionTitle}>6. Retención de los datos</Text>
      <Text style={styles.body}>
        Conservamos los datos de tu cuenta mientras esta exista. Los datos de uso y actividad
        (tiempo de pantalla, eventos de política, alertas y ubicación de geocercas) se
        conservan durante 12 meses y luego se eliminan o anonimizan. Si eliminas tu cuenta,
        eliminaremos los perfiles de tus hijos y los datos asociados, salvo los plazos de
        conservación exigidos por la ley.
      </Text>

      <Text style={styles.sectionTitle}>7. Seguridad: RLS y TLS</Text>
      <Text style={styles.body}>
        Protegemos tu información con medidas técnicas y organizativas: todas las comunicaciones
        viajan cifradas con TLS, el acceso a la base de datos está protegido con políticas de
        seguridad a nivel de fila (RLS) por familia para que cada hogar solo vea sus propios
        datos, las contraseñas se almacenan con hash seguro y limitamos los intentos de acceso
        para prevenir abusos. Ninguna medida es absoluta, pero trabajamos cada día para cuidar
        la información de tu familia.
      </Text>

      <Text style={styles.sectionTitle}>8. Terceros encargados: Supabase, FCM y Sentry</Text>
      <Text style={styles.body}>
        Para prestar el servicio contamos con los siguientes encargados, que solo tratan los
        datos necesarios y bajo nuestras instrucciones:{'\n'}
        • Supabase: alojamiento de la base de datos y autenticación.{'\n'}
        • Firebase Cloud Messaging (FCM): entrega de notificaciones push (únicamente el token
        necesario, sin acceso a tu contenido).{'\n'}
        • Sentry (solo si se activa la monitorización de errores): trazas seudonimizadas con
        fines de diagnóstico.{'\n'}
        No vendemos tus datos ni los compartimos con otros terceros, salvo obligación legal o
        requerimiento de autoridad competente.
      </Text>

      <Text style={styles.sectionTitle}>9. Contacto y cambios</Text>
      <Text style={styles.body}>
        Si tienes preguntas sobre esta política o sobre cómo tratamos los datos de tu familia,
        escríbenos a [EMAIL_SOPORTE] o visítanos en [CIUDAD_ECUADOR], Ecuador. Podremos
        actualizar esta política para reflejar mejoras o cambios normativos; te avisaremos de
        los cambios relevantes dentro de la app y la versión vigente será siempre la publicada
        aquí.
      </Text>

      <Text style={styles.footer}>Última actualización: octubre de 2026</Text>
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
