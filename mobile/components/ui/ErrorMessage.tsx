import { Text, View } from 'react-native'

interface Props {
  message: string
}

export function ErrorMessage({ message }: Props) {
  return (
    <View className="rounded-lg bg-red-50 p-4 mx-4">
      <Text className="text-red-600 text-sm">{message}</Text>
    </View>
  )
}
