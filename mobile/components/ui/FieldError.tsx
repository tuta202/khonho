import { Text } from 'react-native'

interface FieldErrorProps {
  message?: string
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null
  return (
    <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, marginLeft: 2 }}>
      {message}
    </Text>
  )
}
