import { View, Text } from 'react-native'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'gray' | 'navy'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  green:  { bg: '#dcfce7', text: '#16a34a' },
  red:    { bg: '#fee2e2', text: '#dc2626' },
  yellow: { bg: '#fef9c3', text: '#ca8a04' },
  gray:   { bg: '#f3f4f6', text: '#6b7280' },
  navy:   { bg: '#dbeafe', text: '#1e3a5f' },
}

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  const { bg, text } = variantStyles[variant]
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
      <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  )
}
