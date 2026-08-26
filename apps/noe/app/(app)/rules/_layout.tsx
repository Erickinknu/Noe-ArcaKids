import { Stack } from 'expo-router';
import { colors } from '@noe-arcakids/shared';

export default function ControlStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="horarios" />
      <Stack.Screen name="modo-estudio" />
      <Stack.Screen name="geofencing" />
      <Stack.Screen name="filtrado-web" />
    </Stack>
  );
}
