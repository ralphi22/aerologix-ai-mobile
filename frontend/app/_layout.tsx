import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import AboutModal from './components/AboutModal';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <AboutModal />
    </View>
  );
}
