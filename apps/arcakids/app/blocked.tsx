import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function BlockedScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <MaterialIcons name="lock" size={64} color="#DC2626" />
      </View>
      <Text style={styles.title}>Dispositivo bloqueado</Text>
      <Text style={styles.subtitle}>
        Tu padre ha bloqueado este dispositivo.{'\n'}Contacta a tu padre para
        desbloquearlo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 20,
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
