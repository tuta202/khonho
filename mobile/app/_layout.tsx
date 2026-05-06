import '../global.css'
import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { config } from '@gluestack-ui/config'
import Toast from 'react-native-toast-message'
import { StatusBar } from 'expo-status-bar'

import useAuthStore from '../stores/authStore'
import api from '../services/api'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
})

function AuthInit() {
  const { accessToken, hydrated, setUser, setHydrated, logout } = useAuthStore()

  useEffect(() => {
    if (!accessToken) {
      setHydrated(true)
      return
    }

    api.get('/auth/me')
      .then((res) => {
        setUser(res.data)
        setHydrated(true)
      })
      .catch(() => {
        logout()
      })
  }, [])

  return null
}

export default function RootLayout() {
  const { hydrated, accessToken } = useAuthStore()

  if (!hydrated) {
    return <LoadingSpinner />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider config={config}>
        <AuthInit />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <Toast />
      </GluestackUIProvider>
    </QueryClientProvider>
  )
}
