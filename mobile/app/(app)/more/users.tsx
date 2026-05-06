import { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeader } from '../../../components/ui/AppHeader'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { FieldError } from '../../../components/ui/FieldError'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Colors } from '../../../constants/colors'
import { userService } from '../../../services/userService'

interface User {
  id: number
  full_name: string
  email: string
  role: 'owner' | 'staff'
  is_active: boolean
}

interface UserFormData {
  full_name: string
  email: string
  password: string
  role: 'owner' | 'staff'
}

const EMPTY_FORM: UserFormData = { full_name: '', email: '', password: '', role: 'staff' }

export default function UsersScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => userService.list().then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; data: unknown }) =>
      payload.id
        ? userService.update(payload.id, payload.data)
        : userService.create(payload.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setSheetOpen(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Lưu thất bại'
      Alert.alert('Lỗi', msg)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => userService.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: () => Alert.alert('Lỗi', 'Không thể thay đổi trạng thái'),
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Vui lòng nhập họ tên'
    if (!form.email.trim()) e.email = 'Vui lòng nhập email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!editUser && !form.password) e.password = 'Vui lòng nhập mật khẩu'
    else if (!editUser && form.password.length < 6) e.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const openCreate = () => {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setSheetOpen(true)
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({ full_name: u.full_name, email: u.email, password: '', role: u.role })
    setErrors({})
    setSheetOpen(true)
  }

  const handleSave = () => {
    if (!validate()) return
    const payload: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: form.role,
    }
    if (!editUser || form.password) payload.password = form.password
    saveMutation.mutate({ id: editUser?.id, data: payload })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const users = data ?? []

  if (isLoading) return <LoadingSpinner message="Đang tải danh sách..." />
  if (isError) return <ErrorMessage message="Không thể tải danh sách người dùng" onRetry={refetch} />

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader
        title="Người dùng"
        showBack
        rightAction={
          <TouchableOpacity onPress={openCreate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onEdit={() => openEdit(item)}
            onToggle={() => toggleMutation.mutate(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="users" title="Chưa có người dùng" subtitle="Thêm người dùng mới" />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.navy.DEFAULT}
            colors={[Colors.navy.DEFAULT]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editUser ? 'Sửa người dùng' : 'Thêm người dùng'}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <LabeledInput
            label="Họ và tên *"
            value={form.full_name}
            onChangeText={(t) => { setForm((f) => ({ ...f, full_name: t })); setErrors((e) => ({ ...e, full_name: '' })) }}
            error={errors.full_name}
            placeholder="Nguyễn Văn A"
          />
          <View style={{ height: 12 }} />
          <LabeledInput
            label="Email *"
            value={form.email}
            onChangeText={(t) => { setForm((f) => ({ ...f, email: t })); setErrors((e) => ({ ...e, email: '' })) }}
            error={errors.email}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={{ height: 12 }} />
          <LabeledInput
            label={editUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
            value={form.password}
            onChangeText={(t) => { setForm((f) => ({ ...f, password: t })); setErrors((e) => ({ ...e, password: '' })) }}
            error={errors.password}
            placeholder="••••••••"
            secureTextEntry
          />
          <View style={{ height: 12 }} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray[600], marginBottom: 8 }}>
            Vai trò
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['staff', 'owner'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setForm((f) => ({ ...f, role: r }))}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: form.role === r ? Colors.navy.DEFAULT : Colors.gray[200],
                  backgroundColor: form.role === r ? '#dbeafe' : '#fff',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontWeight: '600',
                    color: form.role === r ? Colors.navy.DEFAULT : Colors.gray[500],
                  }}
                >
                  {r === 'staff' ? 'Staff' : 'Owner'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 20 }} />
          <TouchableOpacity
            onPress={handleSave}
            disabled={saveMutation.isPending}
            style={{
              backgroundColor: saveMutation.isPending ? Colors.gray[300] : Colors.navy.DEFAULT,
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 8,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </View>
  )
}

function UserCard({
  user,
  onEdit,
  onToggle,
}: {
  user: User
  onEdit: () => void
  onToggle: () => void
}) {
  const isOwner = user.role === 'owner'
  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isOwner ? Colors.navy.DEFAULT : Colors.gray[200],
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ color: isOwner ? '#fff' : Colors.gray[600], fontWeight: '700', fontSize: 15 }}>
          {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 14, color: Colors.gray[900] }}>
          {user.full_name}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.gray[500], marginTop: 2 }}>{user.email}</Text>
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: 4,
            backgroundColor: isOwner ? '#dbeafe' : Colors.gray[100],
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 99,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: isOwner ? Colors.navy.DEFAULT : Colors.gray[500] }}>
            {isOwner ? 'Owner' : 'Staff'}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Switch
          value={user.is_active}
          onValueChange={onToggle}
          trackColor={{ false: Colors.gray[200], true: Colors.navy.light }}
          thumbColor={user.is_active ? Colors.navy.DEFAULT : Colors.gray[400]}
        />
        <TouchableOpacity onPress={onEdit}>
          <Feather name="edit-2" size={16} color={Colors.gray[400]} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function LabeledInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  error?: string
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: any
  autoCapitalize?: any
}) {
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray[600], marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: error ? '#ef4444' : Colors.gray[200],
          borderRadius: 8,
          backgroundColor: Colors.gray[50],
          paddingHorizontal: 12,
          paddingVertical: 11,
          fontSize: 15,
          color: Colors.gray[900],
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray[400]}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
      />
      {error ? <FieldError message={error} /> : null}
    </View>
  )
}
