import { View, Text, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon = 'inbox', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Feather name={icon} size={48} color={Colors.gray[300]} />
      <Text style={{ fontSize: 17, fontWeight: '600', color: Colors.gray[600], marginTop: 16, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 14, color: Colors.gray[400], marginTop: 6, textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={{
            marginTop: 20,
            backgroundColor: Colors.navy.DEFAULT,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}
