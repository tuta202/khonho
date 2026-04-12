import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Package,
  Warehouse,
  ArrowRightLeft,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import { dashboardService } from '../services/dashboardService'
import useAuthStore from '../stores/authStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TYPE_CFG = {
  import:         { label: 'Nhập',      color: 'text-green-600',  bg: 'bg-green-100' },
  export_sale:    { label: 'Xuất bán',  color: 'text-red-600',    bg: 'bg-red-100' },
  export_damage:  { label: 'Xuất hủy', color: 'text-orange-600', bg: 'bg-orange-100' },
  adjust:         { label: 'Điều chỉnh',color: 'text-gray-600',   bg: 'bg-gray-100' },
  transfer:       { label: 'Chuyển',    color: 'text-yellow-700', bg: 'bg-yellow-100' },
}

function TypeBadge({ type }) {
  const cfg = TYPE_CFG[type] ?? { label: type, color: 'text-gray-600', bg: 'bg-gray-100' }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function fmtCurrency(n) {
  return Number(n).toLocaleString('vi-VN') + ' ₫'
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border p-5 flex items-center gap-4">
      <div className={`${iconBg} rounded-lg p-3 flex-shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Low-stock alerts panel
// ---------------------------------------------------------------------------
function AlertsPanel({ isOwner }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => dashboardService.alerts().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const alerts = data?.alerts ?? []

  return (
    <div className="bg-white rounded-lg border flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          Cảnh báo tồn kho thấp
        </h2>
        <Link to="/warehouses" className="text-xs text-blue-600 hover:underline">
          Xem tất cả →
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto max-h-72">
        {isLoading && (
          <p className="px-5 py-4 text-sm text-gray-400">Đang tải...</p>
        )}
        {!isLoading && alerts.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">Không có cảnh báo — tồn kho đủ</p>
        )}
        {alerts.map((a, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 border-b last:border-0 hover:bg-gray-50">
            <div className="min-w-0 mr-3">
              <p className="text-sm font-medium text-gray-800 truncate">{a.product_name}</p>
              <p className="text-xs text-gray-400">{a.variant} · {a.warehouse_name}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {a.quantity} / {a.threshold}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent transactions panel
// ---------------------------------------------------------------------------
function RecentPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: () => dashboardService.recent().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const txs = data?.transactions ?? []

  return (
    <div className="bg-white rounded-lg border flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-blue-500" />
          Giao dịch gần đây
        </h2>
        <Link to="/transactions" className="text-xs text-blue-600 hover:underline">
          Xem tất cả →
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto max-h-72">
        {isLoading && (
          <p className="px-5 py-4 text-sm text-gray-400">Đang tải...</p>
        )}
        {!isLoading && txs.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">Chưa có giao dịch nào</p>
        )}
        {txs.map((tx) => {
          const variantLabel = [tx.variant.color, tx.variant.size].filter(Boolean).join(' / ') || 'Mặc định'
          const whLabel = tx.type === 'transfer'
            ? `${tx.from_warehouse?.name ?? '?'} → ${tx.to_warehouse?.name ?? '?'}`
            : tx.from_warehouse?.name ?? tx.to_warehouse?.name ?? '—'

          return (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-gray-50">
              <TypeBadge type={tx.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {tx.variant.product_name}
                  <span className="text-gray-400 font-normal"> · {variantLabel}</span>
                </p>
                <p className="text-xs text-gray-400">{whLabel}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-700">×{tx.quantity}</p>
                <p className="text-xs text-gray-400">{fmtTime(tx.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'owner'

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.stats().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const statCards = [
    {
      icon: Package,
      iconBg: 'bg-blue-500',
      label: 'Tổng sản phẩm',
      value: statsLoading ? '—' : stats?.total_products ?? 0,
      sub: `${stats?.total_variants ?? 0} biến thể`,
    },
    {
      icon: Warehouse,
      iconBg: 'bg-indigo-500',
      label: 'Kho hàng',
      value: statsLoading ? '—' : stats?.total_warehouses ?? 0,
      sub: `${stats?.low_stock_count ?? 0} mặt hàng sắp hết`,
    },
    {
      icon: ArrowRightLeft,
      iconBg: 'bg-emerald-500',
      label: 'Giao dịch hôm nay',
      value: statsLoading ? '—' : stats?.transactions_today ?? 0,
    },
    ...(isOwner
      ? [{
          icon: DollarSign,
          iconBg: 'bg-amber-500',
          label: 'Giá trị tồn kho',
          value: statsLoading ? '—' : fmtCurrency(stats?.total_inventory_value ?? 0),
        }]
      : [{
          icon: Package,
          iconBg: 'bg-gray-400',
          label: 'Cảnh báo tồn kho',
          value: statsLoading ? '—' : stats?.low_stock_count ?? 0,
          sub: 'mặt hàng dưới ngưỡng',
        }]
    ),
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Xin chào, <span className="font-medium">{user?.name}</span>
        </p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </div>

      {/* alerts + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertsPanel isOwner={isOwner} />
        <RecentPanel />
      </div>
    </div>
  )
}
