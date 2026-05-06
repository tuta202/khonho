import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'

import api from '../../services/api'
import useAuthStore from '../../stores/authStore'
import { parseApiError } from '../../utils/errorHandler'
import { Colors } from '../../constants/colors'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const shakeAnim = useRef(new Animated.Value(0)).current
  const login = useAuthStore((s) => s.login)

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu')
      shake()
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/auth/login', { email: email.trim(), password })
      await login(res.data)
      router.replace('/(app)/dashboard')
    } catch (err) {
      const { generalError } = parseApiError(err)
      setError(generalError)
      shake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.navy.DEFAULT }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: 'bold', letterSpacing: 1 }}>KhoNhỏ</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 6 }}>Quản lý kho hàng</Text>
        </View>

        {/* Form */}
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TextInput
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 15,
              marginBottom: 12,
              color: '#1f2937',
            }}
            placeholder="📧  Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 15,
              marginBottom: 4,
              color: '#1f2937',
            }}
            placeholder="🔒  Mật khẩu"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />

          {error ? (
            <Text style={{ color: '#fca5a5', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              paddingVertical: 15,
              marginTop: 24,
              alignItems: 'center',
              opacity: loading ? 0.7 : 1,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy.DEFAULT} size="small" />
            ) : null}
            <Text style={{ color: Colors.navy.DEFAULT, fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Version */}
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 48 }}>
          v1.0.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
