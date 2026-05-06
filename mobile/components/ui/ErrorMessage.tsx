import { View, Text, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Feather name="alert-circle" size={40} color="#ef4444" />
      <Text style={{ fontSize: 15, color: Colors.gray[600], marginTop: 12, textAlign: 'center' }}>
        {message}
      </Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: Colors.navy.DEFAULT,
            paddingHorizontal: 20,
            paddingVertical: 9,
            borderRadius: 8,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: Colors.navy.DEFAULT, fontWeight: '600', fontSize: 14 }}>Thử lại</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}
