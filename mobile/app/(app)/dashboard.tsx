import { useState } from 'react'
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import api from '../../services/api'
import useAuthStore from '../../stores/authStore'
import { AppHeader } from '../../components/ui/AppHeader'
import { Colors } from '../../constants/colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardStats {
  total_products: number
  total_variants: number
  total_warehouses: number
  low_stock_count: number
  transactions_today: number
  total_inventory_value: number
}

interface AlertItem {
  product_name: string
  variant: string
  warehouse_name: string
  quantity: number
  threshold: number
}

interface Transaction {
  id: number
  type: 'import' | 'export_sale' | 'export_damage' | 'adjust' | 'transfer'
  quantity: number
  created_at: string
  variant: { display_name: string; product_name: string }
  from_warehouse?: { name: string }
  to_warehouse?: { name: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(n: number) {
  return Number(n).toLocaleString('vi-VN') + ' ₫'
}

function fmtRelative(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: vi })
  } catch {
    return iso
  }
}

const TX_CFG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Feather.glyphMap }> = {
  import:        { label: 'Nhập',       color: '#16a34a', bg: '#dcfce7', icon: 'arrow-down-circle' },
  export_sale:   { label: 'Xuất bán',  color: '#dc2626', bg: '#fee2e2', icon: 'arrow-up-circle' },
  export_damage: { label: 'Xuất hủy', color: '#ea580c', bg: '#ffedd5', icon: 'trash-2' },
  adjust:        { label: 'Điều chỉnh',color: '#6b7280', bg: '#f3f4f6', icon: 'sliders' },
  transfer:      { label: 'Chuyển',    color: '#ca8a04', bg: '#fef9c3', icon: 'shuffle' },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Feather.glyphMap
  iconBg: string
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Feather name={icon} size={18} color="#fff" />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.gray[900] }}>{value}</Text>
      <Text style={{ fontSize: 12, color: Colors.gray[500], marginTop: 3 }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 11, color: Colors.gray[400], marginTop: 2 }}>{sub}</Text> : null}
    </View>
  )
}

function AlertCard({ item }: { item: AlertItem }) {
  return (
    <View
      style={{
        backgroundColor: '#fefce8',
        borderLeftWidth: 3,
        borderLeftColor: '#ef4444',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontWeight: '600', fontSize: 14, color: Colors.gray[800] }} numberOfLines={1}>
          {item.product_name}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.gray[500], marginTop: 2 }}>
          {item.variant} · {item.warehouse_name}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>Sắp hết</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>
          {item.quantity} / {item.threshold}
        </Text>
      </View>
    </View>
  )
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const cfg = TX_CFG[tx.type] ?? TX_CFG.adjust
  const warehouseLabel =
    tx.type === 'transfer'
      ? `${tx.from_warehouse?.name ?? '?'} → ${tx.to_warehouse?.name ?? '?'}`
      : tx.from_warehouse?.name ?? tx.to_warehouse?.name ?? '—'

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
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: cfg.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Feather name={cfg.icon} size={17} color={cfg.color} />
      </View>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.gray[800] }} numberOfLines={1}>
          {tx.variant.product_name}
          <Text style={{ color: Colors.gray[400], fontWeight: '400' }}> · {tx.variant.display_name}</Text>
        </Text>
        <Text style={{ fontSize: 12, color: Colors.gray[400], marginTop: 2 }}>{warehouseLabel}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: cfg.color }}>×{tx.quantity}</Text>
        <Text style={{ fontSize: 11, color: Colors.gray[400], marginTop: 2 }}>{fmtRelative(tx.created_at)}</Text>
      </View>
    </View>
  )
}

function SectionHeader({ icon, title, count }: { icon: keyof typeof Feather.glyphMap; title: string; count?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <Feather name={icon} size={16} color={Colors.navy.DEFAULT} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.gray[800], marginLeft: 6 }}>{title}</Text>
      {count !== undefined ? (
        <View
          style={{
            marginLeft: 6,
            backgroundColor: Colors.navy.light,
            borderRadius: 99,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{count}</Text>
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function DashboardScreen() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: alertsData } = useQuery<{ alerts: AlertItem[] }>({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: recentData } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['dashboard-recent'],
    queryFn: () => api.get('/dashboard/recent').then((r) => r.data),
    refetchInterval: 30_000,
  })

  const alerts = alertsData?.alerts ?? []
  const transactions = recentData?.transactions ?? []

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard-recent'] })
    setRefreshing(false)
  }

  const greeting = user?.full_name ? `Xin chào, ${user.full_name.split(' ').pop()}!` : 'Xin chào!'

  const statCards: Array<{
    icon: keyof typeof Feather.glyphMap
    iconBg: string
    label: string
    value: string | number
    sub?: string
  }> = [
    {
      icon: 'package',
      iconBg: '#3b82f6',
      label: 'Tổng sản phẩm',
      value: statsLoading ? '—' : stats?.total_products ?? 0,
      sub: `${stats?.total_variants ?? 0} biến thể`,
    },
    {
      icon: 'archive',
      iconBg: '#6366f1',
      label: 'Kho hàng',
      value: statsLoading ? '—' : stats?.total_warehouses ?? 0,
      sub: `${stats?.low_stock_count ?? 0} mặt hàng sắp hết`,
    },
    {
      icon: 'repeat',
      iconBg: '#10b981',
      label: 'GD hôm nay',
      value: statsLoading ? '—' : stats?.transactions_today ?? 0,
    },
    isOwner
      ? {
          icon: 'dollar-sign',
          iconBg: '#f59e0b',
          label: 'Giá trị tồn kho',
          value: statsLoading ? '—' : fmtCurrency(stats?.total_inventory_value ?? 0),
        }
      : {
          icon: 'alert-triangle',
          iconBg: '#9ca3af',
          label: 'Cảnh báo tồn kho',
          value: statsLoading ? '—' : stats?.low_stock_count ?? 0,
          sub: 'mặt hàng dưới ngưỡng',
        },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <AppHeader
        title="KhoNhỏ"
        rightAction={
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }} numberOfLines={1}>
            {greeting}
          </Text>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.navy.DEFAULT}
            colors={[Colors.navy.DEFAULT]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stat cards — 2×2 grid */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <StatCard {...statCards[0]} />
          <StatCard {...statCards[1]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <StatCard {...statCards[2]} />
          <StatCard {...statCards[3]} />
        </View>

        {/* Low-stock alerts */}
        {alerts.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="alert-triangle" title="Cảnh báo tồn kho" count={alerts.length} />
            {alerts.map((a, i) => (
              <AlertCard key={i} item={a} />
            ))}
          </View>
        )}

        {/* Recent transactions */}
        <View>
          <SectionHeader icon="clock" title="Giao dịch gần đây" />
          {transactions.length === 0 ? (
            <Text style={{ fontSize: 13, color: Colors.gray[400], textAlign: 'center', paddingVertical: 16 }}>
              Chưa có giao dịch nào hôm nay
            </Text>
          ) : (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                paddingHorizontal: 16,
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
              }}
            >
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
