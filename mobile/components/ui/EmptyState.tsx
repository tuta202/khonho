import { Text, View } from 'react-native'

interface Props {
  title: string
  subtitle?: string
}

export function EmptyState({ title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-lg font-semibold text-gray-600">{title}</Text>
      {subtitle ? <Text className="text-sm text-gray-400 mt-2 text-center">{subtitle}</Text> : null}
    </View>
  )
}
