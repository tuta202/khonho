import { useState, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Swipeable } from 'react-native-gesture-handler'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { warehouseService } from '../../../services/warehouseService'
import useAuthStore from '../../../stores/authStore'
import { parseApiError } from '../../../utils/errorHandler'
import { AppHeader } from '../../../components/ui/AppHeader'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { EmptyState } from '../../../components/ui/EmptyState'
import { FieldError } from '../../../components/ui/FieldError'
import { Colors } from '../../../constants/colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Warehouse {
  id: number
  name: string
  location?: string
  item_count?: number
  low_stock_count?: number
}

// ---------------------------------------------------------------------------
// Warehouse Form
// ---------------------------------------------------------------------------
function WarehouseForm({
  warehouse,
  onClose,
  onDelete,
}: {
  warehouse: Warehouse | null
  onClose: () => void
  onDelete?: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!warehouse
  const [name, setName] = useState(warehouse?.name ?? '')
  const [location, setLocation] = useState(warehouse?.location ?? '')
  const [nameError, setNameError] = useState('')

  const saveMut = useMutation({
    mutationFn: (payload: { name: string; location: string | null }) =>
      isEdit
        ? warehouseService.update(warehouse!.id, payload)
        : warehouseService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      Toast.show({ type: 'success', text1: isEdit ? 'Cập nhật kho thành công' : 'Thêm kho thành công' })
      onClose()
    },
    onError: (err) => {
      const { fieldErrors, generalError } = parseApiError(err)
      if (fieldErrors.name) setNameError(fieldErrors.name)
      if (generalError) Toast.show({ type: 'error', text1: generalError })
    },
  })

  const handleSave = () => {
    setNameError('')
    if (!name.trim()) { setNameError('Tên kho không được để trống'); return }
    saveMut.mutate({ name: name.trim(), location: location.trim() || null })
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.gray[900],
    backgroundColor: '#fff',
    marginTop: 4,
  }
  const labelStyle = { fontSize: 13, fontWeight: '600' as const, color: Colors.gray[700] }

  return (
    <View>
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Tên kho *</Text>
        <TextInput
          style={[inputStyle, nameError ? { borderColor: '#ef4444' } : {}]}
          value={name}
          onChangeText={setName}
          placeholder="VD: Kho chính"
          placeholderTextColor={Colors.gray[400]}
          autoFocus
        />
        <FieldError message={nameError} />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={labelStyle}>Địa điểm</Text>
        <TextInput
          style={inputStyle}
          value={location}
          onChangeText={setLocation}
          placeholder="VD: Tầng 1, số 12 Nguyễn Huệ"
          placeholderTextColor={Colors.gray[400]}
        />
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: Colors.navy.DEFAULT,
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: 'center',
          opacity: saveMut.isPending ? 0.7 : 1,
        }}
        onPress={handleSave}
        disabled={saveMut.isPending}
        activeOpacity={0.8}
      >
        {saveMut.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm kho'}
          </Text>
        )}
      </TouchableOpacity>

      {isEdit && onDelete && (
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: '#ef4444',
            borderRadius: 10,
            paddingVertical: 13,
            alignItems: 'center',
            marginTop: 10,
          }}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 15 }}>Xóa kho</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Warehouse Card with swipe-to-delete
// ---------------------------------------------------------------------------
function WarehouseCard({
  warehouse,
  isOwner,
  onEdit,
  onDelete,
}: {
  warehouse: Warehouse
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const swipeRef = useRef<Swipeable>(null)

  const renderRightActions = () => (
    <TouchableOpacity
      style={{
        backgroundColor: '#ef4444',
        width: 72,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
      }}
      onPress={() => {
        swipeRef.current?.close()
        onDelete()
      }}
    >
      <Feather name="trash-2" size={20} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 11, marginTop: 3, fontWeight: '600' }}>Xóa</Text>
    </TouchableOpacity>
  )

  const card = (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#dbeafe',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="archive" size={18} color={Colors.navy.DEFAULT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.gray[900] }} numberOfLines={1}>
              {warehouse.name}
            </Text>
            {warehouse.location ? (
              <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 2 }} numberOfLines={1}>
                {warehouse.location}
              </Text>
            ) : null}
          </View>
        </View>

        {isOwner && (
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="edit-2" size={16} color={Colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
        {warehouse.item_count !== undefined && (
          <View>
            <Text style={{ fontSize: 11, color: Colors.gray[400] }}>Loại hàng</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.gray[800] }}>{warehouse.item_count}</Text>
          </View>
        )}
        {warehouse.low_stock_count !== undefined && warehouse.low_stock_count > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="alert-triangle" size={13} color="#dc2626" />
            <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '600' }}>
              {warehouse.low_stock_count} sắp hết
            </Text>
          </View>
        )}
      </View>

      {/* Action */}
      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderColor: Colors.navy.DEFAULT,
          borderRadius: 8,
          paddingVertical: 9,
          alignItems: 'center',
        }}
        onPress={() => router.push(`/(app)/warehouses/${warehouse.id}`)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.navy.DEFAULT }}>Xem kho</Text>
      </TouchableOpacity>
    </View>
  )

  if (!isOwner) return card

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} friction={2} overshootRight={false}>
      {card}
    </Swipeable>
  )
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function WarehousesScreen() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()

  const [sheetWarehouse, setSheetWarehouse] = useState<Warehouse | null | undefined>(undefined)
  const sheetVisible = sheetWarehouse !== undefined
  const [refreshing, setRefreshing] = useState(false)

  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseService.list().then((r) => r.data),
  })

  const warehouses: Warehouse[] = Array.isArray(rawData) ? rawData : rawData?.items ?? []

  const deleteMut = useMutation({
    mutationFn: (id: number) => warehouseService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      Toast.show({ type: 'success', text1: 'Đã xóa kho' })
    },
    onError: (err) => {
      const { generalError } = parseApiError(err)
      Toast.show({ type: 'error', text1: generalError })
    },
  })

  const confirmDelete = (w: Warehouse) => {
    Alert.alert(
      'Xóa kho',
      `Bạn chắc chắn muốn xóa "${w.name}"? Thao tác này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => deleteMut.mutate(w.id) },
      ]
    )
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader
        title="Kho hàng"
        rightAction={
          isOwner ? (
            <TouchableOpacity onPress={() => setSheetWarehouse(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.navy.DEFAULT} size="large" />
        </View>
      ) : (
        <FlatList
          data={warehouses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <WarehouseCard
              warehouse={item}
              isOwner={isOwner}
              onEdit={() => setSheetWarehouse(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="archive"
              title="Chưa có kho nào"
              actionLabel={isOwner ? 'Thêm kho' : undefined}
              onAction={isOwner ? () => setSheetWarehouse(null) : undefined}
            />
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
      )}

      {isOwner && (
        <BottomSheet
          visible={sheetVisible}
          onClose={() => setSheetWarehouse(undefined)}
          title={sheetWarehouse ? 'Sửa kho' : 'Thêm kho'}
        >
          {sheetVisible && (
            <WarehouseForm
              warehouse={sheetWarehouse ?? null}
              onClose={() => setSheetWarehouse(undefined)}
              onDelete={
                sheetWarehouse
                  ? () => {
                      setSheetWarehouse(undefined)
                      confirmDelete(sheetWarehouse)
                    }
                  : undefined
              }
            />
          )}
        </BottomSheet>
      )}
    </View>
  )
}
