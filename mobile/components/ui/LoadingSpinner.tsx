import { ActivityIndicator, View } from 'react-native'
import { Colors } from '../../constants/colors'

export function LoadingSpinner() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={Colors.navy.DEFAULT} />
    </View>
  )
}
