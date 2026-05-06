import '../global.css'
import { ActivityIndicator, View, Text } from 'react-native'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { config } from '@gluestack-ui/config'
import Toast from 'react-native-toast-message'
import { StatusBar } from 'expo-status-bar'

import useAuthStore from '../stores/authStore'
import { useAuthInit } from '../hooks/useAuthInit'
import { Colors } from '../constants/colors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
})

function SplashScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy.DEFAULT }}>
      <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>KhoNhỏ</Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 32 }}>Quản lý kho hàng</Text>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  )
}

function AppNavigator() {
  useAuthInit()
  const { hydrated } = useAuthStore()

  if (!hydrated) {
    return <SplashScreen />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider config={config}>
        <StatusBar style="light" />
        <AppNavigator />
        <Toast />
      </GluestackUIProvider>
    </QueryClientProvider>
  )
}
