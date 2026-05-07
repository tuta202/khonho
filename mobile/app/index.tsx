import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import useAuthStore from '../stores/authStore'
import { Colors } from '../constants/colors'

export default function Index() {
  const { accessToken, hydrated } = useAuthStore()

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy.DEFAULT }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    )
  }

  if (accessToken) {
    return <Redirect href="/(app)/dashboard" />
  }

  return <Redirect href="/(auth)/login" />
}
