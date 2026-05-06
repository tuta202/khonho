import { Redirect, Stack } from 'expo-router'
import useAuthStore from '../../stores/authStore'

export default function AuthLayout() {
  const { accessToken, hydrated } = useAuthStore()

  if (hydrated && accessToken) {
    return <Redirect href="/(app)/dashboard" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
