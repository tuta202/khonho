import { ActivityIndicator, View, Text } from 'react-native'
import { Colors } from '../../constants/colors'

interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <ActivityIndicator size="large" color={Colors.navy.DEFAULT} />
      {message ? (
        <Text style={{ marginTop: 12, color: Colors.gray[500], fontSize: 14 }}>{message}</Text>
      ) : null}
    </View>
  )
}
