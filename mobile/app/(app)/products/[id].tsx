import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams()

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-navy">Chi tiết sản phẩm</Text>
      <Text className="text-gray-500 mt-2">ID: {id}</Text>
    </View>
  )
}
