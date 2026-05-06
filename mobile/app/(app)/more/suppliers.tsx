import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Swipeable } from 'react-native-gesture-handler'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeader } from '../../../components/ui/AppHeader'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { FieldError } from '../../../components/ui/FieldError'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Colors } from '../../../constants/colors'
import { supplierService } from '../../../services/supplierService'

interface Supplier {
  id: number
  name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  note?: string
}

interface HistoryEntry {
  id: number
  transaction_type: string
  product_name: string
  display_name: string
  quantity: number
  cost_price?: number
  created_at: string
}

interface HistoryResponse {
  items: HistoryEntry[]
  meta: { page: number; total_pages: number }
}

const EMPTY_FORM = { name: '', contact_name: '', phone: '', email: '', address: '', note: '' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCurrency(n: number) {
  return Number(n).toLocaleString('vi-VN') + '₫'
}

export default function SuppliersScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [sheetMode, setSheetMode] = useState<'form' | 'detail' | null>(null)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.list().then((r) => {
      const raw = r.data
      return Array.isArray(raw) ? raw : raw?.items ?? []
    }),
  })

  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: historyLoading,
  } = useInfiniteQuery<HistoryResponse>({
    queryKey: ['supplier-history', detailSupplier?.id],
    queryFn: ({ pageParam }) =>
      supplierService
        .history(detailSupplier!.id, { page: pageParam, page_size: 20 })
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined,
    enabled: !!detailSupplier && sheetMode === 'detail',
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; data: unknown }) =>
      payload.id
        ? supplierService.update(payload.id, payload.data)
        : supplierService.create(payload.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setSheetMode(null)
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err?.response?.data?.detail ?? 'Lưu thất bại')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: () => Alert.alert('Lỗi', 'Không thể xóa nhà cung cấp'),
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên nhà cung cấp'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const openCreate = () => {
    setEditSupplier(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setSheetMode('form')
  }

  const openEdit = (s: Supplier) => {
    setEditSupplier(s)
    setForm({
      name: s.name,
      contact_name: s.contact_name ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
      note: s.note ?? '',
    })
    setErrors({})
    setSheetMode('form')
  }

  const openDetail = (s: Supplier) => {
    setDetailSupplier(s)
    setSheetMode('detail')
  }

  const handleSave = () => {
    if (!validate()) return
    const payload: Record<string, string> = { name: form.name.trim() }
    if (form.contact_name.trim()) payload.contact_name = form.contact_name.trim()
    if (form.phone.trim()) payload.phone = form.phone.trim()
    if (form.email.trim()) payload.email = form.email.trim()
    if (form.address.trim()) payload.address = form.address.trim()
    if (form.note.trim()) payload.note = form.note.trim()
    saveMutation.mutate({ id: editSupplier?.id, data: payload })
  }

  const confirmDelete = (s: Supplier) => {
    Alert.alert('Xóa nhà cung cấp', `Xóa "${s.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(s.id),
      },
    ])
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const historyItems = historyData?.pages.flatMap((p) => p.items) ?? []

  if (isLoading) return <LoadingSpinner message="Đang tải nhà cung cấp..." />
  if (isError) return <ErrorMessage message="Không thể tải nhà cung cấp" onRetry={refetch} />

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader
        title="Nhà cung cấp"
        showBack
        rightAction={
          <TouchableOpacity onPress={openCreate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={data ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => (
          <SupplierCard
            supplier={item}
            onEdit={() => openEdit(item)}
            onDetail={() => openDetail(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="truck" title="Chưa có nhà cung cấp" subtitle="Thêm nhà cung cấp mới" />
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

      {/* Form sheet */}
      <BottomSheet
        visible={sheetMode === 'form'}
        onClose={() => setSheetMode(null)}
        title={editSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <LabeledInput
            label="Tên nhà cung cấp *"
            value={form.name}
            onChangeText={(t) => { setForm((f) => ({ ...f, name: t })); setErrors((e) => ({ ...e, name: '' })) }}
            error={errors.name}
            placeholder="Công ty ABC"
          />
          <View style={{ height: 12 }} />
          <LabeledInput
            label="Người liên hệ"
            value={form.contact_name}
            onChangeText={(t) => setForm((f) => ({ ...f, contact_name: t }))}
            placeholder="Nguyễn Văn A"
          />
          <View style={{ height: 12 }} />
          <LabeledInput
            label="Số điện thoại"
            value={form.phone}
            onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
            placeholder="0901234567"
            keyboardType="phone-pad"
          />
          <View style={{ height: 12 }} />
          <LabeledInput
            label="Email"
            value={form.email}
            onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
            placeholder="contact@abc.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={{ height: 12 }} />
          <LabeledInput
            label="Địa chỉ"
            value={form.address}
            onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
            placeholder="123 Đường ABC, Quận 1"
          />
          <View style={{ height: 12 }} />
          <LabeledInput
            label="Ghi chú"
            value={form.note}
            onChangeText={(t) => setForm((f) => ({ ...f, note: t }))}
            placeholder="Ghi chú thêm..."
            multiline
          />
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

      {/* Detail sheet */}
      <BottomSheet
        visible={sheetMode === 'detail'}
        onClose={() => setSheetMode(null)}
        title={detailSupplier?.name ?? 'Chi tiết'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
            const isNearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40
            if (isNearEnd && hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          scrollEventThrottle={200}
        >
          {detailSupplier && (
            <View style={{ marginBottom: 16 }}>
              {detailSupplier.contact_name ? (
                <InfoRow icon="user" label={detailSupplier.contact_name} />
              ) : null}
              {detailSupplier.phone ? (
                <InfoRow icon="phone" label={detailSupplier.phone} />
              ) : null}
              {detailSupplier.email ? (
                <InfoRow icon="mail" label={detailSupplier.email} />
              ) : null}
              {detailSupplier.address ? (
                <InfoRow icon="map-pin" label={detailSupplier.address} />
              ) : null}
              {detailSupplier.note ? (
                <InfoRow icon="file-text" label={detailSupplier.note} />
              ) : null}
            </View>
          )}

          <Text style={{ fontWeight: '700', fontSize: 13, color: Colors.gray[500], marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Lịch sử nhập hàng
          </Text>

          {historyLoading ? (
            <LoadingSpinner message="Đang tải lịch sử..." />
          ) : historyItems.length === 0 ? (
            <EmptyState icon="clock" title="Chưa có lịch sử" subtitle="Chưa có giao dịch nào từ nhà cung cấp này" />
          ) : (
            historyItems.map((h) => (
              <View
                key={h.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.navy.DEFAULT,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontWeight: '600', fontSize: 13, color: Colors.gray[800] }} numberOfLines={1}>
                      {h.product_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.gray[500], marginTop: 2 }}>
                      {h.display_name}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.gray[400], marginTop: 4 }}>
                      {fmtDate(h.created_at)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: Colors.navy.DEFAULT }}>
                      +{h.quantity}
                    </Text>
                    {h.cost_price !== undefined && (
                      <Text style={{ fontSize: 11, color: Colors.gray[400], marginTop: 2 }}>
                        {fmtCurrency(h.cost_price)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
          {isFetchingNextPage && <LoadingSpinner />}
          <View style={{ height: 20 }} />
        </ScrollView>
      </BottomSheet>
    </View>
  )
}

function SupplierCard({
  supplier,
  onEdit,
  onDetail,
  onDelete,
}: {
  supplier: Supplier
  onEdit: () => void
  onDetail: () => void
  onDelete: () => void
}) {
  return (
    <Swipeable
      renderRightActions={() => (
        <TouchableOpacity
          onPress={onDelete}
          style={{
            backgroundColor: '#ef4444',
            justifyContent: 'center',
            alignItems: 'center',
            width: 72,
            borderRadius: 12,
            marginBottom: 10,
            marginLeft: 8,
          }}
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      overshootRight={false}
    >
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 14,
          marginBottom: 10,
          shadowColor: '#000',
          shadowOpacity: 0.03,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: Colors.gray[900] }}>
              {supplier.name}
            </Text>
            {supplier.contact_name ? (
              <Text style={{ fontSize: 13, color: Colors.gray[500], marginTop: 2 }}>
                {supplier.contact_name}
              </Text>
            ) : null}
            {supplier.phone ? (
              <Text style={{ fontSize: 13, color: Colors.gray[500], marginTop: 2 }}>
                {supplier.phone}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={onDetail}>
              <Feather name="clock" size={18} color={Colors.gray[400]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onEdit}>
              <Feather name="edit-2" size={18} color={Colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Swipeable>
  )
}

function InfoRow({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <Feather name={icon} size={14} color={Colors.gray[400]} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: 14, color: Colors.gray[700] }}>{label}</Text>
    </View>
  )
}

function LabeledInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  error?: string
  placeholder?: string
  keyboardType?: any
  autoCapitalize?: any
  multiline?: boolean
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
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray[400]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
        multiline={multiline}
      />
      {error ? <FieldError message={error} /> : null}
    </View>
  )
}
