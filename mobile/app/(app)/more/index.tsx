import { ReactNode } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import useAuthStore from '../../../stores/authStore'
import { AppHeader } from '../../../components/ui/AppHeader'
import { Colors } from '../../../constants/colors'

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Feather.glyphMap
  label: string
  onPress: () => void
  danger?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[100],
      }}
      activeOpacity={0.7}
    >
      <Feather name={icon} size={20} color={danger ? '#ef4444' : Colors.gray[600]} />
      <Text
        style={{
          flex: 1,
          marginLeft: 14,
          fontSize: 15,
          color: danger ? '#ef4444' : Colors.gray[800],
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      {!danger && <Feather name="chevron-right" size={16} color={Colors.gray[400]} />}
    </TouchableOpacity>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: Colors.gray[400],
        letterSpacing: 0.8,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 6,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  )
}

export default function MoreScreen() {
  const { user, logout } = useAuthStore()
  const insets = useSafeAreaInsets()
  const isOwner = user?.role === 'owner'

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader title="Khác" />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {/* User info card */}
        <View
          style={{
            margin: 16,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: Colors.navy.DEFAULT,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: Colors.gray[900] }}>
              {user?.full_name ?? ''}
            </Text>
            <Text style={{ fontSize: 13, color: Colors.gray[500], marginTop: 2 }}>
              {user?.email ?? ''}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: isOwner ? '#dbeafe' : Colors.gray[100],
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 99,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isOwner ? Colors.navy.DEFAULT : Colors.gray[500],
              }}
            >
              {isOwner ? 'Owner' : 'Staff'}
            </Text>
          </View>
        </View>

        {/* Tính năng */}
        <SectionHeader label="Tính năng" />
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.gray[100] }}>
          <MenuItem icon="truck" label="Nhà cung cấp" onPress={() => router.push('/(app)/more/suppliers')} />
          <MenuItem icon="bar-chart-2" label="Báo cáo" onPress={() => router.push('/(app)/more/reports')} />
          {isOwner && (
            <MenuItem icon="users" label="Người dùng" onPress={() => router.push('/(app)/more/users')} />
          )}
        </View>

        {/* Tài khoản */}
        <SectionHeader label="Tài khoản" />
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.gray[100] }}>
          <MenuItem icon="lock" label="Đổi mật khẩu" onPress={() => router.push('/(app)/more/change-password')} />
          <MenuItem icon="log-out" label="Đăng xuất" onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </View>
  )
}
