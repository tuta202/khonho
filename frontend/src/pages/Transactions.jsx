import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { transactionService } from '../services/transactionService'
import { productService } from '../services/productService'
import { warehouseService } from '../services/warehouseService'
import { parseApiError } from '../utils/errorHandler'
import { FieldError } from '../components/ui/FieldError'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TYPE_LABELS = {
  import: { label: 'Nhập hàng', color: 'bg-green-100 text-green-700' },
  export_sale: { label: 'Xuất bán', color: 'bg-red-100 text-red-700' },
  export_damage: { label: 'Xuất hủy', color: 'bg-orange-100 text-orange-700' },
  adjust: { label: 'Điều chỉnh', color: 'bg-gray-100 text-gray-700' },
  transfer: { label: 'Chuyển kho', color: 'bg-yellow-100 text-yellow-700' },
}

function TypeBadge({ type }) {
  const cfg = TYPE_LABELS[type] ?? { label: type, color: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Shared — Product + Variant selector
// ---------------------------------------------------------------------------
function ProductVariantSelect({ onVariantSelect, selectedVariantId }) {
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(null)

  const { data: productData } = useQuery({
    queryKey: ['products', { search: productSearch, page: 1 }],
    queryFn: () =>
      productService
        .list({ search: productSearch || undefined, page: 1, per_page: 20 })
        .then((r) => r.data),
  })

  const { data: variants } = useQuery({
    queryKey: ['variants', selectedProductId],
    queryFn: () =>
      productService.listVariants(selectedProductId).then((r) => r.data),
    enabled: !!selectedProductId,
  })

  const products = productData?.items ?? []

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Sản phẩm *</label>
        <input
          value={productSearch}
          onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(null); onVariantSelect(null) }}
          className="input mb-1"
          placeholder="Tìm tên sản phẩm..."
        />
        {products.length > 0 && !selectedProductId && (
          <div className="border rounded-md max-h-40 overflow-y-auto bg-white shadow-sm">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                onClick={() => {
                  setProductSearch(p.name)
                  setSelectedProductId(p.id)
                  onVariantSelect(null)
                }}
              >
                {p.name} {p.sku ? <span className="text-gray-400">({p.sku})</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProductId && (
        <div>
          <label className="label">Biến thể *</label>
          <select
            required
            value={selectedVariantId ?? ''}
            onChange={(e) => onVariantSelect(e.target.value ? parseInt(e.target.value) : null)}
            className="input"
          >
            <option value="">-- Chọn biến thể --</option>
            {(variants ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {[v.color, v.size].filter(Boolean).join(' / ') || 'Mặc định'}
                {v.sku_variant ? ` (${v.sku_variant})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Import form
// ---------------------------------------------------------------------------
function ImportForm({ warehouses }) {
  const qc = useQueryClient()
  const [variantId, setVariantId] = useState(null)
  const [warehouseId, setWarehouseId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const mut = useMutation({
    mutationFn: (data) => transactionService.import(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-inventory'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Nhập hàng thành công')
      setVariantId(null)
      setWarehouseId('')
      setQuantity(1)
      setNote('')
      setFieldErrors({})
    },
    onError: (err) => {
      const { fieldErrors: fe, generalError } = parseApiError(err)
      setFieldErrors(fe)
      if (generalError) toast.error(generalError)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setFieldErrors({})
    if (!variantId) return toast.error('Vui lòng chọn biến thể')
    if (!warehouseId) return toast.error('Vui lòng chọn kho')
    mut.mutate({
      variant_id: variantId,
      to_warehouse_id: parseInt(warehouseId),
      quantity: parseInt(quantity),
      note: note || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <ProductVariantSelect onVariantSelect={setVariantId} selectedVariantId={variantId} />

      <div>
        <label className="label">Kho nhập *</label>
        <select
          required
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="input"
        >
          <option value="">-- Chọn kho --</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Số lượng *</label>
        <input
          type="number"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`input ${fieldErrors.quantity ? 'input-error' : ''}`}
        />
        <FieldError error={fieldErrors.quantity} />
      </div>

      <div>
        <label className="label">Ghi chú</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
          rows={2}
          placeholder="VD: Nhập từ NCC ABC"
        />
      </div>

      <button type="submit" disabled={mut.isPending} className="btn-primary">
        {mut.isPending ? 'Đang xử lý...' : 'Xác nhận nhập hàng'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Export form
// ---------------------------------------------------------------------------
function ExportForm({ warehouses }) {
  const qc = useQueryClient()
  const [variantId, setVariantId] = useState(null)
  const [warehouseId, setWarehouseId] = useState('')
  const [exportType, setExportType] = useState('sale')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Fetch current stock for selected variant+warehouse
  const { data: invData } = useQuery({
    queryKey: ['inv-check', variantId, warehouseId],
    queryFn: () =>
      warehouseService
        .inventory(parseInt(warehouseId), {})
        .then((r) => {
          const item = r.data.items.find((i) => i.variant_id === variantId)
          return item?.quantity ?? 0
        }),
    enabled: !!variantId && !!warehouseId,
  })

  const currentStock = invData ?? null

  const mut = useMutation({
    mutationFn: (data) => transactionService.export(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-inventory'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['inv-check'] })
      toast.success('Xuất hàng thành công')
      setVariantId(null)
      setWarehouseId('')
      setQuantity(1)
      setNote('')
      setFieldErrors({})
    },
    onError: (err) => {
      const { fieldErrors: fe, generalError } = parseApiError(err)
      setFieldErrors(fe)
      if (generalError) toast.error(generalError)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setFieldErrors({})
    if (!variantId) return toast.error('Vui lòng chọn biến thể')
    if (!warehouseId) return toast.error('Vui lòng chọn kho')
    if (currentStock !== null && parseInt(quantity) > currentStock) {
      return toast.error(`Số lượng vượt tồn kho (hiện có: ${currentStock})`)
    }
    mut.mutate({
      variant_id: variantId,
      from_warehouse_id: parseInt(warehouseId),
      quantity: parseInt(quantity),
      export_type: exportType,
      note: note || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <ProductVariantSelect onVariantSelect={setVariantId} selectedVariantId={variantId} />

      <div>
        <label className="label">Kho xuất *</label>
        <select
          required
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="input"
        >
          <option value="">-- Chọn kho --</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
        {currentStock !== null && (
          <p className="text-xs text-gray-500 mt-1">
            Tồn kho hiện tại: <span className="font-semibold">{currentStock}</span>
          </p>
        )}
      </div>

      <div>
        <label className="label">Loại xuất *</label>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          className="input"
        >
          <option value="sale">Xuất bán</option>
          <option value="damage">Xuất hủy</option>
          <option value="adjust">Điều chỉnh</option>
        </select>
      </div>

      <div>
        <label className="label">Số lượng *</label>
        <input
          type="number"
          min={1}
          max={currentStock ?? undefined}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`input ${fieldErrors.quantity ? 'input-error' : ''}`}
        />
        {currentStock !== null && parseInt(quantity) > currentStock && (
          <p className="text-xs text-red-600 mt-1">Vượt quá tồn kho</p>
        )}
        <FieldError error={fieldErrors.quantity} />
      </div>

      <div>
        <label className="label">Ghi chú</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
          rows={2}
          placeholder="VD: Bán cho khách hàng A"
        />
      </div>

      <button type="submit" disabled={mut.isPending} className="btn-primary">
        {mut.isPending ? 'Đang xử lý...' : 'Xác nhận xuất hàng'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// History tab
// ---------------------------------------------------------------------------
function HistoryTab({ warehouses }) {
  const [filterType, setFilterType] = useState('')
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { filterType, filterWarehouse, dateFrom, dateTo, page }],
    queryFn: () =>
      transactionService
        .list({
          type: filterType || undefined,
          warehouse_id: filterWarehouse || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          per_page: 20,
        })
        .then((r) => r.data),
    keepPreviousData: true,
  })

  const items = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          className="input w-44"
        >
          <option value="">Tất cả loại</option>
          <option value="import">Nhập hàng</option>
          <option value="export_sale">Xuất bán</option>
          <option value="export_damage">Xuất hủy</option>
          <option value="adjust">Điều chỉnh</option>
          <option value="transfer">Chuyển kho</option>
        </select>

        <select
          value={filterWarehouse}
          onChange={(e) => { setFilterWarehouse(e.target.value); setPage(1) }}
          className="input w-44"
        >
          <option value="">Tất cả kho</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="input w-40"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="input w-40"
        />
      </div>

      {/* table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Sản phẩm / Biến thể</th>
              <th className="px-4 py-3">Số lượng</th>
              <th className="px-4 py-3">Kho</th>
              <th className="px-4 py-3">Người thực hiện</th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Không có giao dịch</td></tr>
            )}
            {items.map((tx) => {
              const variantLabel = [tx.variant.color, tx.variant.size].filter(Boolean).join(' / ') || 'Mặc định'
              const warehouseLabel = tx.type === 'transfer'
                ? `${tx.from_warehouse?.name ?? '?'} → ${tx.to_warehouse?.name ?? '?'}`
                : tx.from_warehouse?.name ?? tx.to_warehouse?.name ?? '—'

              return (
                <tr key={tx.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(tx.created_at)}</td>
                  <td className="px-4 py-3"><TypeBadge type={tx.type} /></td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{tx.variant.product_name}</div>
                    <div className="text-xs text-gray-400">{variantLabel}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{tx.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{warehouseLabel}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{tx.note ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} / {meta.total}
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary disabled:opacity-40">Trước</button>
            <button disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)} className="btn-secondary disabled:opacity-40">Sau</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Transactions() {
  const [tab, setTab] = useState('import')

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseService.list().then((r) => r.data),
  })

  const tabs = [
    { key: 'import', label: 'Nhập hàng' },
    { key: 'export', label: 'Xuất hàng' },
    { key: 'history', label: 'Lịch sử' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Giao dịch kho</h1>

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

      {tab === 'import' && <ImportForm warehouses={warehouses} />}
      {tab === 'export' && <ExportForm warehouses={warehouses} />}
      {tab === 'history' && <HistoryTab warehouses={warehouses} />}
    </div>
  )
}
