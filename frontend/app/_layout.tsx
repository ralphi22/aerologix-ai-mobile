import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="aircraft/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Aircraft' }} />
      <Stack.Screen name="aircraft/[id]" options={{ headerShown: true, title: 'Aircraft Details' }} />
    </Stack>
  );
}
