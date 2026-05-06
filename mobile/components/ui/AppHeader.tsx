import { ReactNode } from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

interface AppHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: ReactNode
}

export function AppHeader({ title, showBack = false, rightAction }: AppHeaderProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        backgroundColor: Colors.navy.DEFAULT,
        paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 0),
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 22 }} />
      )}

      <Text
        style={{
          flex: 1,
          color: '#fff',
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginHorizontal: 8,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>

      <View style={{ width: 22, alignItems: 'flex-end' }}>
        {rightAction ?? null}
      </View>
    </View>
  )
}
