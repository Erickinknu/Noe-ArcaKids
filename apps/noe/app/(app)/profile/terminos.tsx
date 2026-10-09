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

      <Text style={styles.sectionTitle}>1. Objeto del servicio</Text>
      <Text style={styles.body}>
        [RAZÓN_SOCIAL], con RUC [RUC] y domicilio en [CIUDAD_ECUADOR], Ecuador, pone a tu
        disposición NOE, una plataforma de acompañamiento digital familiar compuesta por la app
        de padres y tutores (NOE) y la app instalada en el dispositivo del menor (ARCA KIDS).
        NOE te permite configurar y supervisar de forma responsable el uso digital de tus hijos:
        límites de tiempo de pantalla, bloqueo de aplicaciones, filtrado web, geocercas,
        horarios, modo de estudio, solicitudes de desbloqueo y reportes de uso. Al aceptar estos
        términos celebras un contrato con [RAZÓN_SOCIAL] para el uso del servicio en los
        términos aquí descritos.
      </Text>

      <Text style={styles.sectionTitle}>2. Cuentas y familia</Text>
      <Text style={styles.body}>
        Para usar NOE debes crear una cuenta con un correo electrónico válido y mantener tu
        contraseña bajo resguardo. Eres responsable de toda la actividad realizada desde tu
        cuenta. Desde tu cuenta podrás crear los perfiles de tus hijos y vincular sus
        dispositivos mediante los códigos de emparejamiento familiares. No compartas estos
        códigos ni tus credenciales fuera de tu núcleo familiar.
      </Text>

      <Text style={styles.sectionTitle}>3. Responsabilidades del titular y del tutor</Text>
      <Text style={styles.body}>
        Como titular de la cuenta te comprometes a: (a) proporcionar información veraz y
        mantenerla actualizada; (b) configurar las reglas de uso respetando los derechos, la
        dignidad y la intimidad del menor; (c) informar al menor, de forma adecuada a su edad,
        de que su dispositivo está supervisado y explicarle las reglas acordadas; (d) no usar el
        servicio para fines ilícitos ni para supervisar a personas adultas o a terceros sin su
        consentimiento; y (e) no intentar eludir, desactivar ni vulnerar los controles de
        seguridad del servicio.
      </Text>

      <Text style={styles.sectionTitle}>4. Menores de edad y consentimiento parental</Text>
      <Text style={styles.body}>
        El servicio está dirigido exclusivamente a padres, madres o tutores legales de menores
        de edad. Al crear el perfil de un menor declaras que ostentas su patria potestad o
        representación legal y otorgas tu consentimiento expreso para el tratamiento de sus
        datos con la finalidad de brindarle protección digital, conforme al interés superior
        del niño, niña y adolescente. El menor no crea una cuenta propia ni introduce datos
        personales directamente en el servicio.
      </Text>

      <Text style={styles.sectionTitle}>5. Monitoreo con consentimiento</Text>
      <Text style={styles.body}>
        Con tu autorización expresa, ARCA KIDS puede utilizar en el dispositivo del menor los
        siguientes recursos, únicamente para aplicar las reglas que tú configuras: ubicación
        (solo para avisarte de entradas y salidas de las geocercas que definas), lista de apps
        instaladas, tiempo de pantalla por aplicación, accesibilidad (para detectar la app en
        primer plano y aplicar bloqueos), VPN local de filtrado web y administrador del
        dispositivo. Ninguna herramienta de control parental es infalible y el servicio se
        ofrece como apoyo, sin sustituir tu acompañamiento y diálogo familiar.
      </Text>

      <Text style={styles.sectionTitle}>6. Planes y límites</Text>
      <Text style={styles.body}>
        NOE ofrece los siguientes planes: Plan Free, que incluye 1 hijo vinculado sin costo;
        Plan Familiar, por USD 4.99 al mes; y Plan Anual, por USD 39.99 al año. Las
        características de cada plan se describen dentro de la app y pueden actualizarse para
        incorporar mejoras. El uso continuado del servicio tras un cambio de plan implica la
        aceptación de sus nuevas condiciones y límites.
      </Text>

      <Text style={styles.sectionTitle}>7. Pagos con DEUNA y activación</Text>
      <Text style={styles.body}>
        Los pagos de los planes de pago se procesan en Ecuador a través de DEUNA. La
        suscripción se activa únicamente tras la verificación efectiva del pago por parte de
        DEUNA. Si el pago es rechazado, revertido o no puede verificarse, la suscripción no se
        activará o podrá suspenderse hasta regularizar el pago. Los precios se muestran en
        dólares de los Estados Unidos de América e incluyen los impuestos aplicables cuando la
        ley así lo exige. Puedes gestionar o cancelar tu suscripción desde la app; la
        cancelación surte efecto al finalizar el período ya pagado, sin reembolsos
        proporcionales salvo lo exigido por la ley ecuatoriana.
      </Text>

      <Text style={styles.sectionTitle}>8. Uso aceptable y suspensión</Text>
      <Text style={styles.body}>
        Nos reservamos el derecho de suspender o finalizar cuentas que incumplan estos
        términos, comprometan la seguridad del servicio o hagan un uso abusivo del mismo, con
        aviso previo cuando sea razonablemente posible. Puedes eliminar tu cuenta y dejar de
        usar el servicio en cualquier momento desde la app.
      </Text>

      <Text style={styles.sectionTitle}>9. Soporte</Text>
      <Text style={styles.body}>
        Nuestro equipo está para ayudarte. Para dudas, reportes o reclamaciones escríbenos a
        [EMAIL_SOPORTE] o utiliza la sección “Ayuda” dentro de la app. Procuraremos responder
        en un plazo razonable y avisarte de interrupciones previsibles por mantenimiento o
        causas ajenas a nuestro control.
      </Text>

      <Text style={styles.sectionTitle}>10. Vigencia, cambios y ley aplicable</Text>
      <Text style={styles.body}>
        Estos términos tienen vigencia indefinida mientras mantengas tu cuenta activa.
        Podremos actualizarlos para reflejar mejoras del servicio o cambios legales; te
        avisaremos de los cambios relevantes dentro de la app y el uso continuado implicará la
        aceptación de la versión vigente. Estos términos se rigen por las leyes de la República
        del Ecuador. Para cualquier controversia, las partes se someten a los jueces
        competentes de [CIUDAD_ECUADOR], sin perjuicio de los derechos irrenunciables del
        consumidor.
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
