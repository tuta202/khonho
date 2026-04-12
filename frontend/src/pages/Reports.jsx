import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { reportService } from '../services/reportService'
import { warehouseService } from '../services/warehouseService'
import useAuthStore from '../stores/authStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(n) {
  return Number(n).toLocaleString('vi-VN') + ' ₫'
}

function SummaryCard({ label, value, sub, color = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Inventory snapshot
// ---------------------------------------------------------------------------
function InventoryTab({ warehouses }) {
  const [warehouseId, setWarehouseId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['report-snapshot', warehouseId],
    queryFn: () =>
      reportService
        .inventorySnapshot({ warehouse_id: warehouseId || undefined })
        .then((r) => r.data),
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      {/* summary chips */}
      {data && (
        <div className="flex gap-3">
          <SummaryCard label="Tổng dòng hàng" value={data.total_items} />
          <SummaryCard
            label="Sắp hết hàng"
            value={data.low_stock_count}
            color={data.low_stock_count > 0 ? 'text-red-600' : 'text-gray-800'}
          />
        </div>
      )}

      {/* filters */}
      <div className="flex gap-3">
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="input w-52"
        >
          <option value="">Tất cả kho</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Màu</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Kho</th>
              <th className="px-4 py-3">Số lượng</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Không có dữ liệu</td></tr>
            )}
            {items.map((item, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.product_name}</td>
                <td className="px-4 py-3 text-gray-400">{item.sku ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{item.category ?? '—'}</td>
                <td className="px-4 py-3">{item.color ?? '—'}</td>
                <td className="px-4 py-3">{item.size ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{item.warehouse_name}</td>
                <td className="px-4 py-3 font-semibold">{item.quantity}</td>
                <td className="px-4 py-3">
                  {item.is_low_stock ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      <AlertTriangle size={11} />
                      Sắp hết
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      Đủ hàng
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Transactions summary
// ---------------------------------------------------------------------------

const TYPE_LABELS = {
  import: 'Nhập hàng',
  export_sale: 'Xuất bán',
  export_damage: 'Xuất hủy',
  transfer: 'Chuyển kho',
  adjust: 'Điều chỉnh',
}

function TransactionsSummaryTab({ warehouses }) {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [warehouseId, setWarehouseId] = useState('')
  const [submitted, setSubmitted] = useState(true)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-tx-summary', dateFrom, dateTo, warehouseId],
    queryFn: () =>
      reportService
        .transactionsSummary({
          date_from: dateFrom,
          date_to: dateTo,
          warehouse_id: warehouseId || undefined,
        })
        .then((r) => r.data),
    enabled: submitted,
  })

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input w-40"
          />
        </div>
        <div>
          <label className="label">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input w-40"
          />
        </div>
        <div>
          <label className="label">Kho</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="input w-44"
          >
            <option value="">Tất cả kho</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setSubmitted(true); refetch() }}
          className="btn-primary"
        >
          Xem báo cáo
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Đang tải...</p>}

      {data && (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="Tổng nhập"
              value={data.total_imported}
              color="text-green-600"
            />
            <SummaryCard
              label="Tổng xuất"
              value={data.total_exported}
              color="text-red-600"
            />
            {Object.entries(data.by_type).map(([type, qty]) => (
              <SummaryCard
                key={type}
                label={TYPE_LABELS[type] ?? type}
                value={qty}
              />
            ))}
          </div>

          {/* top products */}
          {data.top_products.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">
                Top sản phẩm theo số lượng nhập
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-4 py-2">Sản phẩm</th>
                    <th className="px-4 py-2">Đã nhập</th>
                    <th className="px-4 py-2">Đã xuất</th>
                    <th className="px-4 py-2">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_products.map((p) => (
                    <tr key={p.product_id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{p.product_name}</td>
                      <td className="px-4 py-2 text-green-600 font-semibold">+{p.total_imported}</td>
                      <td className="px-4 py-2 text-red-600 font-semibold">-{p.total_exported}</td>
                      <td className="px-4 py-2 font-semibold">
                        {p.total_imported - p.total_exported}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — Inventory value (owner only)
// ---------------------------------------------------------------------------
function InventoryValueTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-inv-value'],
    queryFn: () => reportService.inventoryValue().then((r) => r.data),
  })

  return (
    <div className="space-y-4">
      {data && (
        <div className="flex gap-3">
          <SummaryCard
            label="Tổng giá trị tồn kho"
            value={fmtCurrency(data.grand_total_value)}
            color="text-amber-700"
          />
          <SummaryCard
            label="Tổng số lượng"
            value={data.grand_total_quantity}
          />
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Kho</th>
              <th className="px-4 py-3">Số biến thể</th>
              <th className="px-4 py-3">Tổng SL</th>
              <th className="px-4 py-3">Giá trị tồn kho</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Không có dữ liệu</td></tr>
            )}
            {(data?.items ?? []).map((item) => (
              <tr key={item.warehouse_id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.warehouse_name}</td>
                <td className="px-4 py-3">{item.variant_count}</td>
                <td className="px-4 py-3 font-semibold">{item.total_quantity}</td>
                <td className="px-4 py-3 font-semibold text-amber-700">
                  {fmtCurrency(item.total_value)}
                </td>
              </tr>
            ))}
            {data && (
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="px-4 py-3">Tổng cộng</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">{data.grand_total_quantity}</td>
                <td className="px-4 py-3 text-amber-700">{fmtCurrency(data.grand_total_value)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Reports() {
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'owner'

  const [tab, setTab] = useState('inventory')

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseService.list().then((r) => r.data),
  })

  const tabs = [
    { key: 'inventory', label: 'Tồn kho' },
    { key: 'transactions', label: 'Nhập / Xuất' },
    ...(isOwner ? [{ key: 'value', label: 'Giá trị kho' }] : []),
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Báo cáo</h1>

      {/* tabs */}
      <div className="flex border-b mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-2 px-5 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && <InventoryTab warehouses={warehouses} />}
      {tab === 'transactions' && <TransactionsSummaryTab warehouses={warehouses} />}
      {tab === 'value' && isOwner && <InventoryValueTab />}
    </div>
  )
}
