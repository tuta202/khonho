import { useState, useMemo } from 'react'
import { View, Text, FlatList, TextInput, RefreshControl, TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { warehouseService } from '../../../services/warehouseService'
import useAuthStore from '../../../stores/authStore'
import { AppHeader } from '../../../components/ui/AppHeader'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Colors } from '../../../constants/colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InventoryItem {
  variant_id: number
  product_name: string
  display_name: string
  quantity: number
  cost_price?: number
  is_low_stock: boolean
  threshold?: number
}

interface InventoryResponse {
  items: InventoryItem[]
  low_stock_count: number
  warehouse_name?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(n: number) {
  return Number(n).toLocaleString('vi-VN') + '₫'
}

// ---------------------------------------------------------------------------
// Inventory Item Row
// ---------------------------------------------------------------------------
function InventoryRow({ item, isOwner }: { item: InventoryItem; isOwner: boolean }) {
  return (
    <View
      style={{
        backgroundColor: item.is_low_stock ? '#fffbeb' : '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 8,
        borderLeftWidth: item.is_low_stock ? 3 : 0,
        borderLeftColor: '#ef4444',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.gray[800] }} numberOfLines={1}>
            {item.product_name}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.gray[500], marginTop: 2 }}>
            {item.display_name}
          </Text>
          {isOwner && item.cost_price !== undefined && (
            <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 4 }}>
              Giá vốn: {fmtCurrency(item.cost_price)}
            </Text>
          )}
          {item.threshold !== undefined && item.is_low_stock && (
            <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
              Ngưỡng: {item.threshold}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: item.is_low_stock ? '#dc2626' : '#16a34a',
            }}
          >
            {item.quantity}
          </Text>
          {item.is_low_stock && (
            <View
              style={{
                backgroundColor: '#fee2e2',
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 99,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Feather name="alert-triangle" size={10} color="#dc2626" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>Sắp hết</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function WarehouseInventoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const warehouseId = parseInt(id ?? '0')
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<InventoryResponse>({
    queryKey: ['warehouse-inventory', warehouseId],
    queryFn: () => warehouseService.inventory(warehouseId).then((r) => r.data),
    enabled: !!warehouseId,
  })

  // Sort: low stock first, then alphabetically
  const allItems = useMemo(() => {
    const items = data?.items ?? []
    return [...items].sort((a, b) => {
      if (a.is_low_stock !== b.is_low_stock) return a.is_low_stock ? -1 : 1
      return a.product_name.localeCompare(b.product_name, 'vi')
    })
  }, [data])

  // Local filter — no API call
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems
    const q = search.trim().toLowerCase()
    return allItems.filter(
      (item) =>
        item.product_name.toLowerCase().includes(q) ||
        item.display_name.toLowerCase().includes(q)
    )
  }, [allItems, search])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const warehouseName = data?.warehouse_name ?? `Kho #${warehouseId}`
  const lowCount = data?.low_stock_count ?? 0

  if (isLoading) return <LoadingSpinner message="Đang tải tồn kho..." />
  if (isError) return <ErrorMessage message="Không thể tải dữ liệu kho" onRetry={refetch} />

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader title={warehouseName} showBack />

      {/* Summary bar */}
      {lowCount > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#fff7ed',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#fed7aa',
          }}
        >
          <Feather name="alert-triangle" size={14} color="#ea580c" />
          <Text style={{ fontSize: 13, color: '#c2410c', fontWeight: '600' }}>
            {lowCount} mặt hàng sắp hết hàng
          </Text>
        </View>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.variant_id)}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: Colors.gray[200],
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 12,
              gap: 8,
            }}
          >
            <Feather name="search" size={16} color={Colors.gray[400]} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: Colors.gray[900] }}
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm sản phẩm..."
              placeholderTextColor={Colors.gray[400]}
              clearButtonMode="while-editing"
            />
          </View>
        }
        renderItem={({ item }) => <InventoryRow item={item} isOwner={isOwner} />}
        ListEmptyComponent={
          search.trim() ? (
            <EmptyState
              icon="search"
              title={`Không tìm thấy "${search}"`}
              subtitle="Thử từ khóa khác"
            />
          ) : (
            <EmptyState icon="inbox" title="Kho chưa có hàng" subtitle="Tạo giao dịch nhập kho để bắt đầu" />
          )
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
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}
