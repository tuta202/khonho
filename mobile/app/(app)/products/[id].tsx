import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { productService } from '../../../services/productService'
import useAuthStore from '../../../stores/authStore'
import { parseApiError } from '../../../utils/errorHandler'
import { AppHeader } from '../../../components/ui/AppHeader'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Badge } from '../../../components/ui/Badge'
import { FieldError } from '../../../components/ui/FieldError'
import { Colors } from '../../../constants/colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Attribute { attr_name: string; attr_value: string }

interface Variant {
  id: number
  display_name: string
  sku_variant?: string
  attributes: Attribute[]
  total_quantity: number
  cost_price_override?: number
}

interface ProductDetail {
  id: number
  name: string
  sku?: string
  category?: string
  cost_price?: number
  selling_price?: number
  low_stock_threshold: number
  total_quantity: number
  supplier?: { id: number; name: string }
}

type VariantForm = {
  sku_variant: string
  cost_price_override: string
  attributes: Attribute[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(n: number) {
  return Number(n).toLocaleString('vi-VN') + '₫'
}

const labelStyle = { fontSize: 13, fontWeight: '600' as const, color: Colors.gray[500], marginBottom: 2 }
const valueStyle = { fontSize: 15, color: Colors.gray[900] }

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] }}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{String(value)}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Variant Form
// ---------------------------------------------------------------------------
function VariantForm({
  variant,
  productId,
  isOwner,
  onClose,
}: {
  variant: Variant | null
  productId: number
  isOwner: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!variant

  const [form, setForm] = useState<VariantForm>({
    sku_variant: variant?.sku_variant ?? '',
    cost_price_override: variant?.cost_price_override != null ? String(variant.cost_price_override) : '',
    attributes: variant?.attributes?.length
      ? variant.attributes.map((a) => ({ attr_name: a.attr_name, attr_value: a.attr_value }))
      : [{ attr_name: '', attr_value: '' }],
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const saveMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? productService.updateVariant(productId, variant!.id, payload)
        : productService.createVariant(productId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
      Toast.show({ type: 'success', text1: isEdit ? 'Cập nhật biến thể thành công' : 'Thêm biến thể thành công' })
      onClose()
    },
    onError: (err) => {
      const { fieldErrors: fe, generalError } = parseApiError(err)
      setFieldErrors(fe)
      if (generalError) Toast.show({ type: 'error', text1: generalError })
    },
  })

  const addAttr = () =>
    setForm((f) => ({ ...f, attributes: [...f.attributes, { attr_name: '', attr_value: '' }] }))

  const removeAttr = (i: number) =>
    setForm((f) => ({ ...f, attributes: f.attributes.filter((_, idx) => idx !== i) }))

  const updateAttr = (i: number, key: keyof Attribute, val: string) =>
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, idx) => (idx === i ? { ...a, [key]: val } : a)),
    }))

  const handleSave = () => {
    setFieldErrors({})
    const attrs = form.attributes.filter((a) => a.attr_name.trim() && a.attr_value.trim())
    const payload: Record<string, unknown> = {
      sku_variant: form.sku_variant.trim() || null,
      attributes: attrs,
    }
    if (isOwner && form.cost_price_override !== '') {
      payload.cost_price_override = parseFloat(form.cost_price_override) || null
    }
    saveMut.mutate(payload)
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.gray[900],
    backgroundColor: '#fff',
    marginTop: 4,
    flex: 1,
  }

  return (
    <View>
      {/* Attributes builder */}
      <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.gray[700], marginBottom: 10 }}>
        Thuộc tính
      </Text>

      {form.attributes.map((attr, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <TextInput
            style={[inputStyle, { flex: 1 }]}
            placeholder="Tên (VD: Màu)"
            placeholderTextColor={Colors.gray[400]}
            value={attr.attr_name}
            onChangeText={(v) => updateAttr(i, 'attr_name', v)}
          />
          <TextInput
            style={[inputStyle, { flex: 1 }]}
            placeholder="Giá trị (VD: Đỏ)"
            placeholderTextColor={Colors.gray[400]}
            value={attr.attr_value}
            onChangeText={(v) => updateAttr(i, 'attr_value', v)}
          />
          <TouchableOpacity
            onPress={() => removeAttr(i)}
            disabled={form.attributes.length === 1}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather
              name="x-circle"
              size={20}
              color={form.attributes.length === 1 ? Colors.gray[300] : '#ef4444'}
            />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 8,
          marginBottom: 16,
        }}
        onPress={addAttr}
      >
        <Feather name="plus-circle" size={16} color={Colors.navy.DEFAULT} />
        <Text style={{ fontSize: 14, color: Colors.navy.DEFAULT, fontWeight: '600' }}>Thêm thuộc tính</Text>
      </TouchableOpacity>

      {/* SKU variant */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray[700] }}>SKU biến thể</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: Colors.gray[300],
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: Colors.gray[900],
            marginTop: 4,
          }}
          placeholder="Tùy chọn"
          placeholderTextColor={Colors.gray[400]}
          value={form.sku_variant}
          onChangeText={(v) => setForm((f) => ({ ...f, sku_variant: v }))}
          autoCapitalize="characters"
        />
      </View>

      {/* Cost price override — owner only */}
      {isOwner && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray[700] }}>Giá vốn riêng (₫)</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.gray[300],
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: Colors.gray[900],
              marginTop: 4,
            }}
            placeholder="Để trống = dùng giá vốn sản phẩm"
            placeholderTextColor={Colors.gray[400]}
            value={form.cost_price_override}
            onChangeText={(v) => setForm((f) => ({ ...f, cost_price_override: v }))}
            keyboardType="numeric"
          />
        </View>
      )}

      <FieldError message={fieldErrors.attributes ?? fieldErrors.sku_variant} />

      <TouchableOpacity
        style={{
          backgroundColor: Colors.navy.DEFAULT,
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: 4,
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
            {isEdit ? 'Cập nhật' : 'Thêm biến thể'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Variant Row
// ---------------------------------------------------------------------------
function VariantRow({
  variant,
  threshold,
  isOwner,
  onEdit,
}: {
  variant: Variant
  threshold: number
  isOwner: boolean
  onEdit: () => void
}) {
  const isLow = variant.total_quantity <= threshold
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[100],
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.gray[800] }}>
          {variant.display_name}
        </Text>
        {variant.sku_variant ? (
          <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 2 }}>
            SKU: {variant.sku_variant}
          </Text>
        ) : null}
        {isOwner && variant.cost_price_override != null ? (
          <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 2 }}>
            Giá vốn: {fmtCurrency(variant.cost_price_override)}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: isLow ? '#dc2626' : '#16a34a' }}>
          {variant.total_quantity}
        </Text>
        {isLow && (
          <Badge label="Sắp hết" variant="red" />
        )}
      </View>
      <TouchableOpacity
        onPress={onEdit}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="edit-2" size={16} color={Colors.gray[500]} />
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const productId = parseInt(id ?? '0')
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()

  const [variantSheet, setVariantSheet] = useState<Variant | null | undefined>(undefined)
  const variantSheetVisible = variantSheet !== undefined
  const [refreshing, setRefreshing] = useState(false)

  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
    refetch: refetchProduct,
  } = useQuery<ProductDetail>({
    queryKey: ['product', productId],
    queryFn: () => productService.get(productId).then((r) => r.data),
    enabled: !!productId,
  })

  const {
    data: variants = [],
    isLoading: variantsLoading,
    refetch: refetchVariants,
  } = useQuery<Variant[]>({
    queryKey: ['variants', productId],
    queryFn: () => productService.listVariants(productId).then((r) => r.data),
    enabled: !!productId,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchProduct(), refetchVariants()])
    setRefreshing(false)
  }

  if (productLoading) return <LoadingSpinner message="Đang tải..." />
  if (productError || !product) return <ErrorMessage message="Không thể tải thông tin sản phẩm" onRetry={refetchProduct} />

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader title={product.name} showBack />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.navy.DEFAULT}
            colors={[Colors.navy.DEFAULT]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Product info card */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.gray[700], marginBottom: 8 }}>
            Thông tin sản phẩm
          </Text>
          <InfoRow label="SKU" value={product.sku} />
          <InfoRow label="Danh mục" value={product.category} />
          <InfoRow label="Nhà cung cấp" value={product.supplier?.name} />
          {isOwner && <InfoRow label="Giá vốn" value={product.cost_price != null ? fmtCurrency(product.cost_price) : null} />}
          <InfoRow label="Giá bán" value={product.selling_price != null ? fmtCurrency(product.selling_price) : null} />
          <InfoRow label="Ngưỡng cảnh báo" value={product.low_stock_threshold} />
          <View style={{ paddingVertical: 10 }}>
            <Text style={labelStyle}>Tổng tồn kho</Text>
            <Text
              style={[
                valueStyle,
                { fontWeight: '700', color: product.total_quantity <= product.low_stock_threshold ? '#dc2626' : '#16a34a' },
              ]}
            >
              {product.total_quantity}
            </Text>
          </View>
        </View>

        {/* Variants section */}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.gray[700] }}>
              Biến thể ({variantsLoading ? '…' : variants.length})
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => setVariantSheet(null)}
            >
              <Feather name="plus" size={16} color={Colors.navy.DEFAULT} />
              <Text style={{ fontSize: 13, color: Colors.navy.DEFAULT, fontWeight: '600' }}>Thêm</Text>
            </TouchableOpacity>
          </View>

          {variantsLoading ? (
            <ActivityIndicator color={Colors.navy.DEFAULT} style={{ paddingVertical: 16 }} />
          ) : variants.length === 0 ? (
            <Text style={{ fontSize: 13, color: Colors.gray[400], paddingVertical: 12, textAlign: 'center' }}>
              Chưa có biến thể nào
            </Text>
          ) : (
            variants.map((v) => (
              <VariantRow
                key={v.id}
                variant={v}
                threshold={product.low_stock_threshold}
                isOwner={isOwner}
                onEdit={() => setVariantSheet(v)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={variantSheetVisible}
        onClose={() => setVariantSheet(undefined)}
        title={variantSheet ? 'Sửa biến thể' : 'Thêm biến thể'}
      >
        {variantSheetVisible && (
          <VariantForm
            variant={variantSheet ?? null}
            productId={productId}
            isOwner={isOwner}
            onClose={() => setVariantSheet(undefined)}
          />
        )}
      </BottomSheet>
    </View>
  )
}
