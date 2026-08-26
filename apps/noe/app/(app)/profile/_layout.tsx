import { Stack } from 'expo-router';
import { colors } from '@noe-arcakids/shared';

export default function OtrosStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="familia" />
      <Stack.Screen name="cuenta" />
      <Stack.Screen name="notificaciones-ajustes" />
      <Stack.Screen name="pin" />
      <Stack.Screen name="config" />
      <Stack.Screen name="ayuda" />
      <Stack.Screen name="sugerir" />
      <Stack.Screen name="compartir" />
      <Stack.Screen name="privacidad" />
      <Stack.Screen name="terminos" />
    </Stack>
  );
}
