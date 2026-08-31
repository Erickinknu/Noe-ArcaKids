import React from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/arca-kids.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    marginBottom: 30,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  spinnerContainer: {
    marginTop: 30,
  },
});