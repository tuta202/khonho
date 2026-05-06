import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { AppHeader } from '../../../components/ui/AppHeader'
import { FieldError } from '../../../components/ui/FieldError'
import { Colors } from '../../../constants/colors'
import { userService } from '../../../services/userService'

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!currentPassword) e.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
    if (!newPassword) e.newPassword = 'Vui lòng nhập mật khẩu mới'
    else if (newPassword.length < 6) e.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự'
    if (!confirmPassword) e.confirmPassword = 'Vui lòng xác nhận mật khẩu mới'
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      Alert.alert('Thành công', 'Mật khẩu đã được đổi thành công', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Đổi mật khẩu thất bại'
      Alert.alert('Lỗi', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader title="Đổi mật khẩu" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <PasswordField
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChangeText={(t) => { setCurrentPassword(t); setErrors((e) => ({ ...e, currentPassword: '' })) }}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            error={errors.currentPassword}
          />

          <View style={{ height: 16 }} />

          <PasswordField
            label="Mật khẩu mới"
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); setErrors((e) => ({ ...e, newPassword: '' })) }}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            error={errors.newPassword}
          />

          <View style={{ height: 16 }} />

          <PasswordField
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: '' })) }}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={errors.confirmPassword}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            marginTop: 24,
            backgroundColor: loading ? Colors.gray[300] : Colors.navy.DEFAULT,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function PasswordField({
  label,
  value,
  onChangeText,
  show,
  onToggle,
  error,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  show: boolean
  onToggle: () => void
  error?: string
}) {
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray[600], marginBottom: 6 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? '#ef4444' : Colors.gray[200],
          borderRadius: 8,
          backgroundColor: Colors.gray[50],
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          style={{ flex: 1, paddingVertical: 11, fontSize: 15, color: Colors.gray[900] }}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="••••••••"
          placeholderTextColor={Colors.gray[400]}
        />
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name={show ? 'eye-off' : 'eye'} size={18} color={Colors.gray[400]} />
        </TouchableOpacity>
      </View>
      {error ? <FieldError message={error} /> : null}
    </View>
  )
}
