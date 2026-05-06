import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns'

import { transactionService } from '../../services/transactionService'
import { productService } from '../../services/productService'
import { warehouseService } from '../../services/warehouseService'
import { parseApiError } from '../../utils/errorHandler'
import { AppHeader } from '../../components/ui/AppHeader'
import { SearchableDropdown, DropdownOption } from '../../components/ui/SearchableDropdown'
import { EmptyState } from '../../components/ui/EmptyState'
import { Colors } from '../../constants/colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TabKey = 'import' | 'export' | 'history'

interface Warehouse { id: number; name: string }
interface Variant { id: number; display_name: string; sku_variant?: string }
interface Product { id: number; name: string; sku?: string }

interface Transaction {
  id: number
  type: string
  quantity: number
  created_at: string
  note?: string
  variant: { display_name: string; product_name: string }
  from_warehouse?: { name: string }
  to_warehouse?: { name: string }
  user?: { full_name: string }
}

interface TransactionsPage {
  items: Transaction[]
  meta: { page: number; total_pages: number }
}

type ExportType = 'export_sale' | 'export_damage' | 'adjust'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

const TX_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  import:        { label: 'Nhập hàng',   color: '#16a34a', bg: '#dcfce7', icon: '↓' },
  export_sale:   { label: 'Xuất bán',   color: '#dc2626', bg: '#fee2e2', icon: '↑' },
  export_damage: { label: 'Xuất hủy',  color: '#ea580c', bg: '#ffedd5', icon: '↑' },
  adjust:        { label: 'Điều chỉnh', color: '#6b7280', bg: '#f3f4f6', icon: '~' },
  transfer:      { label: 'Chuyển kho', color: '#ca8a04', bg: '#fef9c3', icon: '⇄' },
}

function fmtDateTime(iso: string) {
  try {
    return format(new Date(iso), 'HH:mm - dd/MM')
  } catch { return iso }
}

function getDateRange(range: string): { date_from?: string; date_to?: string } {
  const now = new Date()
  const toISO = (d: Date) => d.toISOString()
  if (range === 'today') return { date_from: toISO(startOfDay(now)) }
  if (range === 'week') return { date_from: toISO(startOfWeek(now, { weekStartsOn: 1 })) }
  if (range === 'month') return { date_from: toISO(startOfMonth(now)) }
  return {}
}

// ---------------------------------------------------------------------------
// Tab Bar
// ---------------------------------------------------------------------------
const TABS: { key: TabKey; label: string }[] = [
  { key: 'import', label: 'Nhập hàng' },
  { key: 'export', label: 'Xuất hàng' },
  { key: 'history', label: 'Lịch sử' },
]

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.gray[200] }}>
      {TABS.map((tab) => {
        const isActive = active === tab.key
        return (
          <TouchableOpacity
            key={tab.key}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: isActive ? Colors.navy.DEFAULT : 'transparent',
            }}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: isActive ? '700' : '500', color: isActive ? Colors.navy.DEFAULT : Colors.gray[500] }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------
function Stepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max?: number }) {
  const dec = () => onChange(Math.max(1, value - 1))
  const inc = () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <TouchableOpacity
        onPress={dec}
        style={{ width: 40, height: 44, borderWidth: 1, borderColor: Colors.gray[300], borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}
      >
        <Feather name="minus" size={18} color={Colors.gray[600]} />
      </TouchableOpacity>

      <TextInput
        style={{
          flex: 1,
          marginHorizontal: 8,
          borderWidth: 1,
          borderColor: max !== undefined && value > max ? '#ef4444' : Colors.gray[300],
          borderRadius: 8,
          height: 44,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: '700',
          color: Colors.gray[900],
          backgroundColor: '#fff',
        }}
        value={String(value)}
        onChangeText={(v) => {
          const n = parseInt(v) || 1
          onChange(max !== undefined ? Math.min(max, Math.max(1, n)) : Math.max(1, n))
        }}
        keyboardType="numeric"
      />

      <TouchableOpacity
        onPress={inc}
        style={{ width: 40, height: 44, borderWidth: 1, borderColor: Colors.gray[300], borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}
      >
        <Feather name="plus" size={18} color={Colors.gray[600]} />
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Shared: Product + Variant selectors
// ---------------------------------------------------------------------------
function ProductVariantSelector({
  selectedProduct,
  selectedVariantId,
  onProductChange,
  onVariantChange,
}: {
  selectedProduct: Product | null
  selectedVariantId: number | null
  onProductChange: (p: Product | null) => void
  onVariantChange: (id: number | null) => void
}) {
  const [productSearch, setProductSearch] = useState(selectedProduct?.name ?? '')
  const debouncedSearch = useDebounce(productSearch, 300)

  const { data: productData, isFetching: productsFetching } = useQuery({
    queryKey: ['products-select', debouncedSearch],
    queryFn: () =>
      productService.list({ search: debouncedSearch || undefined, page: 1, per_page: 20 }).then((r) => r.data),
  })

  const { data: variants = [], isFetching: variantsFetching } = useQuery<Variant[]>({
    queryKey: ['variants', selectedProduct?.id],
    queryFn: () => productService.listVariants(selectedProduct!.id).then((r) => r.data),
    enabled: !!selectedProduct,
  })

  const productOptions: DropdownOption[] = (productData?.items ?? []).map((p: Product) => ({
    label: p.name + (p.sku ? ` (${p.sku})` : ''),
    value: p.id,
  }))

  const variantOptions: DropdownOption[] = variants.map((v) => ({
    label: v.display_name + (v.sku_variant ? ` · ${v.sku_variant}` : ''),
    value: v.id,
  }))

  const handleProductSelect = (opt: DropdownOption) => {
    const p = (productData?.items ?? []).find((x: Product) => x.id === opt.value) ?? null
    onProductChange(p)
    onVariantChange(null)
  }

  return (
    <>
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Sản phẩm *</Text>
        <SearchableDropdown
          placeholder="Chọn sản phẩm..."
          value={selectedProduct?.id ?? null}
          displayValue={selectedProduct?.name}
          options={productOptions}
          onSelect={handleProductSelect}
          onSearch={setProductSearch}
          searchable
          loading={productsFetching}
        />
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Biến thể *</Text>
        <SearchableDropdown
          placeholder="Chọn biến thể..."
          value={selectedVariantId}
          options={variantOptions}
          onSelect={(opt) => onVariantChange(opt.value)}
          disabled={!selectedProduct}
          loading={variantsFetching && !!selectedProduct}
        />
      </View>
    </>
  )
}

// ---------------------------------------------------------------------------
// Import Tab
// ---------------------------------------------------------------------------
function ImportTab({ warehouses }: { warehouses: Warehouse[] }) {
  const qc = useQueryClient()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')

  const warehouseOptions: DropdownOption[] = warehouses.map((w) => ({ label: w.name, value: w.id }))

  const resetForm = () => {
    setSelectedProduct(null)
    setSelectedVariantId(null)
    setSelectedWarehouseId(null)
    setQuantity(1)
    setNote('')
  }

  const importMut = useMutation({
    mutationFn: (data: unknown) => transactionService.import(data),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      Toast.show({ type: 'success', text1: 'Nhập kho thành công' })
      resetForm()
    },
    onError: (err) => {
      const { generalError } = parseApiError(err)
      Toast.show({ type: 'error', text1: generalError })
    },
  })

  const handleSubmit = () => {
    if (!selectedVariantId) return Toast.show({ type: 'error', text1: 'Vui lòng chọn biến thể' })
    if (!selectedWarehouseId) return Toast.show({ type: 'error', text1: 'Vui lòng chọn kho nhập' })
    importMut.mutate({ variant_id: selectedVariantId, to_warehouse_id: selectedWarehouseId, quantity, note: note || null })
  }

  return (
    <ScrollView contentContainerStyle={formPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <ProductVariantSelector
        selectedProduct={selectedProduct}
        selectedVariantId={selectedVariantId}
        onProductChange={setSelectedProduct}
        onVariantChange={setSelectedVariantId}
      />

      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Kho nhập *</Text>
        <SearchableDropdown
          placeholder="Chọn kho..."
          value={selectedWarehouseId}
          options={warehouseOptions}
          onSelect={(opt) => setSelectedWarehouseId(opt.value)}
        />
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Số lượng *</Text>
        <Stepper value={quantity} onChange={setQuantity} />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={labelStyle}>Ghi chú</Text>
        <TextInput
          style={noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Tùy chọn..."
          placeholderTextColor={Colors.gray[400]}
          multiline
          numberOfLines={2}
        />
      </View>

      <TouchableOpacity
        style={[submitBtn, importMut.isPending && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={importMut.isPending}
        activeOpacity={0.8}
      >
        {importMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : null}
        <Text style={submitBtnText}>Xác nhận nhập</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Export Tab
// ---------------------------------------------------------------------------
const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: 'export_sale', label: 'Bán' },
  { value: 'export_damage', label: 'Hủy' },
  { value: 'adjust', label: 'Điều chỉnh' },
]

function ExportTab({ warehouses }: { warehouses: Warehouse[] }) {
  const qc = useQueryClient()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [exportType, setExportType] = useState<ExportType>('export_sale')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')

  const warehouseOptions: DropdownOption[] = warehouses.map((w) => ({ label: w.name, value: w.id }))

  // Fetch current stock
  const { data: currentStock } = useQuery<number | null>({
    queryKey: ['inv-check', selectedVariantId, selectedWarehouseId],
    queryFn: () =>
      warehouseService.inventory(selectedWarehouseId!, {}).then((r) => {
        const item = (r.data.items ?? []).find((i: { variant_id: number; quantity: number }) => i.variant_id === selectedVariantId)
        return item?.quantity ?? 0
      }),
    enabled: !!selectedVariantId && !!selectedWarehouseId,
  })

  const overLimit = currentStock !== null && currentStock !== undefined && quantity > currentStock

  const resetForm = () => {
    setSelectedProduct(null)
    setSelectedVariantId(null)
    setSelectedWarehouseId(null)
    setQuantity(1)
    setNote('')
    setExportType('export_sale')
  }

  const exportMut = useMutation({
    mutationFn: (data: unknown) => transactionService.export(data),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inv-check'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      Toast.show({ type: 'success', text1: 'Xuất kho thành công' })
      resetForm()
    },
    onError: (err) => {
      const { generalError } = parseApiError(err)
      Toast.show({ type: 'error', text1: generalError })
    },
  })

  const handleSubmit = () => {
    if (!selectedVariantId) return Toast.show({ type: 'error', text1: 'Vui lòng chọn biến thể' })
    if (!selectedWarehouseId) return Toast.show({ type: 'error', text1: 'Vui lòng chọn kho xuất' })
    if (overLimit) return Toast.show({ type: 'error', text1: `Tối đa ${currentStock}` })
    exportMut.mutate({ variant_id: selectedVariantId, from_warehouse_id: selectedWarehouseId, quantity, export_type: exportType, note: note || null })
  }

  return (
    <ScrollView contentContainerStyle={formPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <ProductVariantSelector
        selectedProduct={selectedProduct}
        selectedVariantId={selectedVariantId}
        onProductChange={(p) => { setSelectedProduct(p); setSelectedVariantId(null) }}
        onVariantChange={setSelectedVariantId}
      />

      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Kho xuất *</Text>
        <SearchableDropdown
          placeholder="Chọn kho..."
          value={selectedWarehouseId}
          options={warehouseOptions}
          onSelect={(opt) => setSelectedWarehouseId(opt.value)}
        />
      </View>

      {/* Current stock badge */}
      {currentStock !== null && currentStock !== undefined && selectedVariantId && selectedWarehouseId && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
          <Feather name="info" size={14} color={Colors.gray[500]} />
          <Text style={{ fontSize: 13, color: Colors.gray[600] }}>
            Tồn kho hiện tại:{' '}
            <Text style={{ fontWeight: '700', color: currentStock <= 0 ? '#dc2626' : Colors.gray[900] }}>
              {currentStock}
            </Text>
          </Text>
        </View>
      )}

      {/* Export type radio */}
      <View style={{ marginBottom: 14 }}>
        <Text style={labelStyle}>Loại xuất</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {EXPORT_TYPES.map((et) => (
            <TouchableOpacity
              key={et.value}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: exportType === et.value ? Colors.navy.DEFAULT : Colors.gray[200],
                backgroundColor: exportType === et.value ? '#eff6ff' : '#fff',
                alignItems: 'center',
              }}
              onPress={() => setExportType(et.value)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: exportType === et.value ? Colors.navy.DEFAULT : Colors.gray[600] }}>
                {et.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 4 }}>
        <Text style={labelStyle}>Số lượng *</Text>
        <Stepper value={quantity} onChange={setQuantity} max={currentStock ?? undefined} />
        {overLimit && (
          <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>
            Tối đa {currentStock}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 24, marginTop: 14 }}>
        <Text style={labelStyle}>Ghi chú</Text>
        <TextInput
          style={noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Tùy chọn..."
          placeholderTextColor={Colors.gray[400]}
          multiline
          numberOfLines={2}
        />
      </View>

      <TouchableOpacity
        style={[submitBtn, { backgroundColor: '#dc2626' }, (exportMut.isPending || overLimit) && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={exportMut.isPending || overLimit}
        activeOpacity={0.8}
      >
        {exportMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : null}
        <Text style={submitBtnText}>Xác nhận xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------
const DATE_RANGES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
]

const TYPE_FILTER_OPTIONS: DropdownOption[] = [
  { label: 'Tất cả loại', value: '' },
  { label: 'Nhập hàng', value: 'import' },
  { label: 'Xuất bán', value: 'export_sale' },
  { label: 'Xuất hủy', value: 'export_damage' },
  { label: 'Điều chỉnh', value: 'adjust' },
  { label: 'Chuyển kho', value: 'transfer' },
]

function TransactionRow({ tx }: { tx: Transaction }) {
  const cfg = TX_CFG[tx.type] ?? TX_CFG.adjust
  const whLabel = tx.type === 'transfer'
    ? `${tx.from_warehouse?.name ?? '?'} → ${tx.to_warehouse?.name ?? '?'}`
    : tx.from_warehouse?.name ?? tx.to_warehouse?.name ?? '—'

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      {/* Type indicator */}
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: cfg.color, fontWeight: '800' }}>{cfg.icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: cfg.color }}>
            {tx.type === 'import' || tx.type === 'adjust' ? '+' : '−'}{tx.quantity}
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.gray[800] }} numberOfLines={1}>
          {tx.variant.product_name}
          <Text style={{ fontWeight: '400', color: Colors.gray[400] }}> · {tx.variant.display_name}</Text>
        </Text>
        <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 3 }}>
          {whLabel}  ·  {fmtDateTime(tx.created_at)}
          {tx.user?.full_name ? `  ·  ${tx.user.full_name}` : ''}
        </Text>
      </View>
    </View>
  )
}

function HistoryTab() {
  const insets = useSafeAreaInsets()
  const [filterType, setFilterType] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const dateParams = getDateRange(dateRange)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery<TransactionsPage>({
    queryKey: ['transactions', { filterType, dateRange }],
    queryFn: ({ pageParam }) =>
      transactionService.list({
        type: filterType || undefined,
        page: pageParam as number,
        per_page: 20,
        ...dateParams,
      }).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined,
  })

  const transactions = data?.pages.flatMap((p) => p.items) ?? []

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <View style={{ flex: 1 }}>
      {/* Filter bar */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.gray[100], padding: 12, gap: 8 }}>
        {/* Type filter */}
        <SearchableDropdown
          placeholder="Tất cả loại"
          value={filterType}
          options={TYPE_FILTER_OPTIONS}
          onSelect={(opt) => setFilterType(opt.value)}
        />

        {/* Date range */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DATE_RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={{
                flex: 1,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: dateRange === r.key ? Colors.navy.DEFAULT : Colors.gray[100],
                alignItems: 'center',
              }}
              onPress={() => setDateRange(r.key)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: dateRange === r.key ? '#fff' : Colors.gray[600] }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 12 }}
        renderItem={({ item }) => <TransactionRow tx={item} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator color={Colors.navy.DEFAULT} />
            </View>
          ) : (
            <EmptyState icon="clock" title="Chưa có giao dịch nào" />
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.navy.DEFAULT} colors={[Colors.navy.DEFAULT]} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function TransactionsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('import')

  const { data: warehousesData } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['warehouses'],
    queryFn: () => warehouseService.list().then((r) => r.data),
  })
  const warehouses: Warehouse[] = warehousesData ?? []

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader title="Nhập / Xuất" />
      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'import' && <ImportTab warehouses={warehouses} />}
      {activeTab === 'export' && <ExportTab warehouses={warehouses} />}
      {activeTab === 'history' && <HistoryTab />}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const labelStyle = { fontSize: 13, fontWeight: '600' as const, color: Colors.gray[700] }

const formPad = { padding: 16, paddingBottom: 40 }

const noteInput = {
  borderWidth: 1,
  borderColor: Colors.gray[300],
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: Colors.gray[900],
  backgroundColor: '#fff',
  marginTop: 4,
  minHeight: 60,
  textAlignVertical: 'top' as const,
}

const submitBtn = {
  backgroundColor: Colors.navy.DEFAULT,
  borderRadius: 10,
  paddingVertical: 15,
  alignItems: 'center' as const,
  flexDirection: 'row' as const,
  justifyContent: 'center' as const,
  gap: 8,
}

const submitBtnText = { color: '#fff', fontWeight: '700' as const, fontSize: 16 }
