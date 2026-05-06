import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { productService } from '../../../services/productService'
import { supplierService } from '../../../services/supplierService'
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
interface Supplier { id: number; name: string }

interface Product {
  id: number
  name: string
  sku?: string
  category?: string
  cost_price?: number
  selling_price?: number
  low_stock_threshold: number
  total_quantity: number
  supplier?: { id: number; name: string }
  variants?: { id: number }[]
  variant_count?: number
}

interface ProductsPage {
  items: Product[]
  meta: { page: number; per_page: number; total: number; total_pages: number }
}

type ProductForm = {
  name: string
  sku: string
  category: string
  cost_price: string
  selling_price: string
  low_stock_threshold: string
  supplier_id: string
}

const emptyForm = (): ProductForm => ({
  name: '',
  sku: '',
  category: '',
  cost_price: '0',
  selling_price: '0',
  low_stock_threshold: '5',
  supplier_id: '',
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(n: number) {
  return Number(n).toLocaleString('vi-VN') + '₫'
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// Product Form inside BottomSheet
// ---------------------------------------------------------------------------
function ProductForm({
  product,
  isOwner,
  onClose,
}: {
  product: Product | null
  isOwner: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!product

  const [form, setForm] = useState<ProductForm>(
    product
      ? {
          name: product.name,
          sku: product.sku ?? '',
          category: product.category ?? '',
          cost_price: String(product.cost_price ?? 0),
          selling_price: String(product.selling_price ?? 0),
          low_stock_threshold: String(product.low_stock_threshold ?? 5),
          supplier_id: String(product.supplier?.id ?? ''),
        }
      : emptyForm()
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers', 'all'],
    queryFn: () => supplierService.list({ page: 1, per_page: 100 }).then((r) => r.data?.items ?? []),
  })

  const selectedSupplier = suppliers.find((s) => String(s.id) === form.supplier_id)

  const saveMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit ? productService.update(product!.id, payload) : productService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      Toast.show({ type: 'success', text1: isEdit ? 'Cập nhật thành công' : 'Thêm sản phẩm thành công' })
      onClose()
    },
    onError: (err) => {
      const { fieldErrors: fe, generalError } = parseApiError(err)
      setFieldErrors(fe)
      if (generalError) Toast.show({ type: 'error', text1: generalError })
    },
  })

  const set = (key: keyof ProductForm, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = () => {
    setFieldErrors({})
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Tên sản phẩm không được để trống' })
      return
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category.trim() || null,
      selling_price: parseFloat(form.selling_price) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
    }
    if (isOwner) payload.cost_price = parseFloat(form.cost_price) || 0
    saveMut.mutate(payload)
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
      {/* Name */}
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Tên sản phẩm *</Text>
        <TextInput
          style={inputStyle}
          value={form.name}
          onChangeText={(v) => set('name', v)}
          placeholder="VD: Áo thun cotton"
          placeholderTextColor={Colors.gray[400]}
        />
        <FieldError message={fieldErrors.name} />
      </View>

      {/* SKU */}
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>SKU</Text>
        <TextInput
          style={inputStyle}
          value={form.sku}
          onChangeText={(v) => set('sku', v)}
          placeholder="VD: AT001"
          placeholderTextColor={Colors.gray[400]}
          autoCapitalize="characters"
        />
      </View>

      {/* Category */}
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Danh mục</Text>
        <TextInput
          style={inputStyle}
          value={form.category}
          onChangeText={(v) => set('category', v)}
          placeholder="VD: Thời trang"
          placeholderTextColor={Colors.gray[400]}
        />
      </View>

      {/* Cost price — owner only */}
      {isOwner && (
        <View style={{ marginBottom: 14 }}>
          <Text style={labelStyle}>Giá vốn (₫)</Text>
          <TextInput
            style={inputStyle}
            value={form.cost_price}
            onChangeText={(v) => set('cost_price', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.gray[400]}
          />
        </View>
      )}

      {/* Selling price */}
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Giá bán (₫){!isOwner ? ' *' : ''}</Text>
        <TextInput
          style={[inputStyle, !isOwner && { backgroundColor: Colors.gray[50] }]}
          value={form.selling_price}
          onChangeText={(v) => set('selling_price', v)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.gray[400]}
        />
      </View>

      {/* Low stock threshold */}
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Ngưỡng cảnh báo</Text>
        <TextInput
          style={inputStyle}
          value={form.low_stock_threshold}
          onChangeText={(v) => set('low_stock_threshold', v)}
          keyboardType="numeric"
          placeholder="5"
          placeholderTextColor={Colors.gray[400]}
        />
      </View>

      {/* Supplier picker */}
      <View style={{ marginBottom: 20 }}>
        <Text style={labelStyle}>Nhà cung cấp</Text>
        <TouchableOpacity
          style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
          onPress={() => setShowSupplierPicker((v) => !v)}
        >
          <Text style={{ fontSize: 15, color: selectedSupplier ? Colors.gray[900] : Colors.gray[400] }}>
            {selectedSupplier?.name ?? 'Chọn nhà cung cấp'}
          </Text>
          <Feather name={showSupplierPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray[500]} />
        </TouchableOpacity>

        {showSupplierPicker && (
          <View
            style={{
              borderWidth: 1,
              borderColor: Colors.gray[200],
              borderRadius: 8,
              marginTop: 4,
              maxHeight: 160,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] }}
              onPress={() => { set('supplier_id', ''); setShowSupplierPicker(false) }}
            >
              <Text style={{ fontSize: 14, color: Colors.gray[400] }}>— Không chọn —</Text>
            </TouchableOpacity>
            {suppliers.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.gray[100],
                  backgroundColor: form.supplier_id === String(s.id) ? '#eff6ff' : '#fff',
                }}
                onPress={() => { set('supplier_id', String(s.id)); setShowSupplierPicker(false) }}
              >
                <Text style={{ fontSize: 14, color: Colors.gray[800] }}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Save button */}
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
            {isEdit ? 'Cập nhật' : 'Thêm sản phẩm'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------
function ProductCard({
  product,
  isOwner,
  onEdit,
}: {
  product: Product
  isOwner: boolean
  onEdit: (p: Product) => void
}) {
  const isLowStock = product.total_quantity <= product.low_stock_threshold
  const variantCount = product.variant_count ?? product.variants?.length ?? 0

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 10,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      {/* Name row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.gray[900], flex: 1, marginRight: 8 }} numberOfLines={1}>
          {product.name}
        </Text>
        {isLowStock && (
          <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#dc2626' }}>Sắp hết</Text>
          </View>
        )}
      </View>

      {/* Meta */}
      <Text style={{ fontSize: 12, color: Colors.gray[400], marginBottom: 8 }}>
        {product.sku ? `SKU: ${product.sku}  ·  ` : ''}{variantCount} biến thể
      </Text>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 11, color: Colors.gray[400] }}>Tồn kho</Text>
          <Text
            style={{ fontSize: 14, fontWeight: '700', color: isLowStock ? '#dc2626' : '#16a34a' }}
          >
            {product.total_quantity}
          </Text>
        </View>
        {isOwner && product.cost_price !== undefined && (
          <View>
            <Text style={{ fontSize: 11, color: Colors.gray[400] }}>Giá vốn</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.gray[700] }}>
              {fmtCurrency(product.cost_price)}
            </Text>
          </View>
        )}
        {product.selling_price !== undefined && (
          <View>
            <Text style={{ fontSize: 11, color: Colors.gray[400] }}>Giá bán</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.gray[700] }}>
              {fmtCurrency(product.selling_price)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: Colors.gray[300],
            borderRadius: 8,
            paddingVertical: 8,
            alignItems: 'center',
          }}
          onPress={() => onEdit(product)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray[700] }}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: Colors.navy.DEFAULT,
            borderRadius: 8,
            paddingVertical: 8,
            alignItems: 'center',
          }}
          onPress={() => router.push(`/(app)/products/${product.id}`)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Chi tiết</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ProductsScreen() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const insets = useSafeAreaInsets()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [sheetProduct, setSheetProduct] = useState<Product | null | undefined>(undefined)
  const sheetVisible = sheetProduct !== undefined
  const [refreshing, setRefreshing] = useState(false)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery<ProductsPage>({
    queryKey: ['products', { search: debouncedSearch }],
    queryFn: ({ pageParam }) =>
      productService
        .list({ page: pageParam as number, per_page: 20, search: debouncedSearch || undefined })
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined,
  })

  const products = data?.pages.flatMap((p) => p.items) ?? []

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader
        title="Sản phẩm"
        rightAction={
          <TouchableOpacity onPress={() => setSheetProduct(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
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
              marginBottom: 14,
              gap: 8,
            }}
          >
            <Feather name="search" size={16} color={Colors.gray[400]} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: Colors.gray[900] }}
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm kiếm sản phẩm..."
              placeholderTextColor={Colors.gray[400]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            isOwner={isOwner}
            onEdit={(p) => setSheetProduct(p)}
          />
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator color={Colors.navy.DEFAULT} />
            </View>
          ) : (
            <EmptyState
              icon="package"
              title="Chưa có sản phẩm nào"
              subtitle={debouncedSearch ? `Không tìm thấy "${debouncedSearch}"` : undefined}
              actionLabel={!debouncedSearch ? 'Thêm sản phẩm' : undefined}
              onAction={!debouncedSearch ? () => setSheetProduct(null) : undefined}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.navy.DEFAULT} size="small" />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.navy.DEFAULT}
            colors={[Colors.navy.DEFAULT]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetProduct(undefined)}
        title={sheetProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      >
        {sheetVisible && (
          <ProductForm
            product={sheetProduct ?? null}
            isOwner={isOwner}
            onClose={() => setSheetProduct(undefined)}
          />
        )}
      </BottomSheet>
    </View>
  )
}
