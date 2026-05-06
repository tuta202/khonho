import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeader } from '../../../components/ui/AppHeader'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Colors } from '../../../constants/colors'
import { reportService } from '../../../services/reportService'
import useAuthStore from '../../../stores/authStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SnapshotItem {
  warehouse_name: string
  product_name: string
  display_name: string
  quantity: number
  cost_price?: number
  is_low_stock: boolean
}

interface SnapshotResponse {
  items: SnapshotItem[]
  generated_at: string
  total_items: number
  low_stock_count: number
}

interface SummaryPeriod {
  type: string
  count: number
  total_quantity: number
  total_value?: number
}

interface SummaryResponse {
  period: string
  from_date: string
  to_date: string
  by_type: SummaryPeriod[]
  total_transactions: number
}

interface InventoryValueResponse {
  total_value: number
  warehouse_breakdown: Array<{ warehouse_name: string; value: number; item_count: number }>
  generated_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(n: number) {
  return Number(n).toLocaleString('vi-VN') + '₫'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const TYPE_LABELS: Record<string, string> = {
  import: 'Nhập hàng',
  export: 'Xuất hàng',
  transfer: 'Chuyển kho',
  adjustment: 'Điều chỉnh',
}

const PERIOD_OPTIONS = [
  { label: 'Hôm nay', value: 'day' },
  { label: 'Tuần', value: 'week' },
  { label: 'Tháng', value: 'month' },
]

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: Colors.gray[400],
        letterSpacing: 0.8,
        paddingTop: 20,
        paddingBottom: 8,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  )
}

// ---------------------------------------------------------------------------
// Export button
// ---------------------------------------------------------------------------
async function exportCSV(filename: string, csvContent: string) {
  try {
    const path = FileSystem.cacheDirectory + filename
    await FileSystem.writeAsStringAsync(path, csvContent, { encoding: FileSystem.EncodingType.UTF8 })
    const canShare = await Sharing.isAvailableAsync()
    if (!canShare) {
      Alert.alert('Không hỗ trợ', 'Thiết bị không hỗ trợ chia sẻ file')
      return
    }
    await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' })
  } catch {
    Alert.alert('Lỗi', 'Không thể xuất file')
  }
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ReportsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const [period, setPeriod] = useState('month')
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const snapshotQuery = useQuery<SnapshotResponse>({
    queryKey: ['report-snapshot', refreshKey],
    queryFn: () => reportService.inventorySnapshot().then((r) => r.data),
  })

  const summaryQuery = useQuery<SummaryResponse>({
    queryKey: ['report-summary', period, refreshKey],
    queryFn: () => reportService.transactionsSummary({ period }).then((r) => r.data),
  })

  const valueQuery = useQuery<InventoryValueResponse>({
    queryKey: ['report-value', refreshKey],
    queryFn: () => reportService.inventoryValue().then((r) => r.data),
    enabled: isOwner,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshKey((k) => k + 1)
    setRefreshing(false)
  }

  const exportSnapshot = async () => {
    const items = snapshotQuery.data?.items ?? []
    const header = isOwner
      ? 'Kho,Sản phẩm,Biến thể,Số lượng,Giá vốn,Sắp hết\n'
      : 'Kho,Sản phẩm,Biến thể,Số lượng,Sắp hết\n'
    const rows = items
      .map((i) => {
        const base = `${i.warehouse_name},${i.product_name},${i.display_name},${i.quantity}`
        if (isOwner) return base + `,${i.cost_price ?? ''},${i.is_low_stock ? 'Có' : 'Không'}`
        return base + `,${i.is_low_stock ? 'Có' : 'Không'}`
      })
      .join('\n')
    await exportCSV(`ton-kho-${Date.now()}.csv`, header + rows)
  }

  const exportSummary = async () => {
    const data = summaryQuery.data
    if (!data) return
    const header = isOwner
      ? 'Loại,Số giao dịch,Tổng số lượng,Tổng giá trị\n'
      : 'Loại,Số giao dịch,Tổng số lượng\n'
    const rows = (data.by_type ?? [])
      .map((t) => {
        const label = TYPE_LABELS[t.type] ?? t.type
        const base = `${label},${t.count},${t.total_quantity}`
        if (isOwner) return base + `,${t.total_value ?? 0}`
        return base
      })
      .join('\n')
    await exportCSV(`giao-dich-${Date.now()}.csv`, header + rows)
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader title="Báo cáo" showBack />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
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
        {/* ── Tồn kho ── */}
        <SectionHeader label="Tồn kho hiện tại" />
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          {snapshotQuery.isLoading ? (
            <View style={{ padding: 20 }}>
              <ActivityIndicator color={Colors.navy.DEFAULT} />
            </View>
          ) : snapshotQuery.isError ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#ef4444', fontSize: 13 }}>Không thể tải báo cáo tồn kho</Text>
            </View>
          ) : (
            <>
              {/* Summary row */}
              <View
                style={{
                  flexDirection: 'row',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.gray[100],
                  gap: 16,
                }}
              >
                <StatMini
                  label="Tổng mặt hàng"
                  value={String(snapshotQuery.data?.total_items ?? 0)}
                />
                <View style={{ width: 1, backgroundColor: Colors.gray[100] }} />
                <StatMini
                  label="Sắp hết hàng"
                  value={String(snapshotQuery.data?.low_stock_count ?? 0)}
                  valueColor="#dc2626"
                />
                {snapshotQuery.data?.generated_at && (
                  <>
                    <View style={{ width: 1, backgroundColor: Colors.gray[100] }} />
                    <StatMini
                      label="Cập nhật"
                      value={fmtDate(snapshotQuery.data.generated_at)}
                      small
                    />
                  </>
                )}
              </View>

              {/* Low stock items */}
              {(snapshotQuery.data?.items ?? [])
                .filter((i) => i.is_low_stock)
                .slice(0, 5)
                .map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.gray[50],
                      backgroundColor: '#fffbeb',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray[800] }} numberOfLines={1}>
                        {item.product_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: Colors.gray[500] }}>{item.warehouse_name}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#dc2626' }}>
                      {item.quantity}
                    </Text>
                  </View>
                ))}

              {/* Export button */}
              <TouchableOpacity
                onPress={exportSnapshot}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 14,
                }}
              >
                <Feather name="download" size={15} color={Colors.navy.DEFAULT} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.navy.DEFAULT }}>
                  Xuất CSV
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Giao dịch ── */}
        <SectionHeader label="Giao dịch" />

        {/* Period selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setPeriod(opt.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 99,
                backgroundColor: period === opt.value ? Colors.navy.DEFAULT : '#fff',
                borderWidth: 1,
                borderColor: period === opt.value ? Colors.navy.DEFAULT : Colors.gray[200],
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: period === opt.value ? '#fff' : Colors.gray[600],
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          {summaryQuery.isLoading ? (
            <View style={{ padding: 20 }}>
              <ActivityIndicator color={Colors.navy.DEFAULT} />
            </View>
          ) : summaryQuery.isError ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#ef4444', fontSize: 13 }}>Không thể tải báo cáo giao dịch</Text>
            </View>
          ) : (
            <>
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] }}>
                <Text style={{ fontSize: 12, color: Colors.gray[400] }}>
                  {summaryQuery.data?.from_date && summaryQuery.data?.to_date
                    ? `${fmtDate(summaryQuery.data.from_date)} – ${fmtDate(summaryQuery.data.to_date)}`
                    : ''}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.gray[900], marginTop: 4 }}>
                  {summaryQuery.data?.total_transactions ?? 0} giao dịch
                </Text>
              </View>

              {(summaryQuery.data?.by_type ?? []).map((t) => (
                <View
                  key={t.type}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.gray[50],
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.gray[800] }}>
                      {TYPE_LABELS[t.type] ?? t.type}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 2 }}>
                      {t.count} giao dịch · {t.total_quantity} sản phẩm
                    </Text>
                  </View>
                  {isOwner && t.total_value !== undefined && (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.navy.DEFAULT }}>
                      {fmtCurrency(t.total_value)}
                    </Text>
                  )}
                </View>
              ))}

              <TouchableOpacity
                onPress={exportSummary}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 14,
                }}
              >
                <Feather name="download" size={15} color={Colors.navy.DEFAULT} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.navy.DEFAULT }}>
                  Xuất CSV
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Giá trị tồn kho (Owner only) ── */}
        {isOwner && (
          <>
            <SectionHeader label="Giá trị tồn kho" />
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
              }}
            >
              {valueQuery.isLoading ? (
                <View style={{ padding: 20 }}>
                  <ActivityIndicator color={Colors.navy.DEFAULT} />
                </View>
              ) : valueQuery.isError ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>Không thể tải giá trị tồn kho</Text>
                </View>
              ) : (
                <>
                  <View
                    style={{
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.gray[100],
                      backgroundColor: '#f0f4ff',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: Colors.gray[500] }}>Tổng giá trị tồn kho</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.navy.DEFAULT, marginTop: 4 }}>
                      {fmtCurrency(valueQuery.data?.total_value ?? 0)}
                    </Text>
                  </View>

                  {(valueQuery.data?.warehouse_breakdown ?? []).map((wb, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.gray[50],
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.gray[800] }}>
                          {wb.warehouse_name}
                        </Text>
                        <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 2 }}>
                          {wb.item_count} mặt hàng
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.navy.DEFAULT }}>
                        {fmtCurrency(wb.value)}
                      </Text>
                    </View>
                  ))}

                  {valueQuery.data?.generated_at && (
                    <View style={{ padding: 12 }}>
                      <Text style={{ fontSize: 11, color: Colors.gray[400], textAlign: 'center' }}>
                        Cập nhật: {fmtDate(valueQuery.data.generated_at)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function StatMini({
  label,
  value,
  valueColor,
  small,
}: {
  label: string
  value: string
  valueColor?: string
  small?: boolean
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: Colors.gray[400], marginBottom: 2 }}>{label}</Text>
      <Text
        style={{
          fontSize: small ? 13 : 18,
          fontWeight: '700',
          color: valueColor ?? Colors.gray[900],
        }}
      >
        {value}
      </Text>
    </View>
  )
}
