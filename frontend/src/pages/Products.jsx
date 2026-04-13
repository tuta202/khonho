import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { productService } from '../services/productService'
import useAuthStore from '../stores/authStore'
import { parseApiError } from '../utils/errorHandler'
import { FieldError } from '../components/ui/FieldError'

// ---------------------------------------------------------------------------
// Modal — Add / Edit product
// ---------------------------------------------------------------------------
function ProductModal({ product, onClose, isOwner }) {
  const qc = useQueryClient()
  const isEdit = !!product

  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? '',
    cost_price: product?.cost_price ?? '0',
    selling_price: product?.selling_price ?? '0',
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    supplier_id: product?.supplier?.id ?? '',
  })

  // variant rows for new product
  const [fieldErrors, setFieldErrors] = useState({})

  const [variantRows, setVariantRows] = useState(
    product?.variants?.length
      ? product.variants.map((v) => ({
          id: v.id,
          color: v.color ?? '',
          size: v.size ?? '',
          sku_variant: v.sku_variant ?? '',
        }))
      : [{ color: '', size: '', sku_variant: '' }]
  )
  const [tab, setTab] = useState('info')

  const createMut = useMutation({
    mutationFn: (data) => productService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Thêm sản phẩm thành công')
      onClose()
    },
    onError: (err) => {
      const { fieldErrors: fe, generalError } = parseApiError(err)
      setFieldErrors(fe)
      if (generalError) toast.error(generalError)
    },
  })

  const updateMut = useMutation({
    mutationFn: (data) => productService.update(product.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Cập nhật thành công')
      onClose()
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
    const payload = {
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      selling_price: parseFloat(form.selling_price) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
    }
    if (isOwner) {
      payload.cost_price = parseFloat(form.cost_price) || 0
    }
    if (!isEdit) {
      payload.variants = variantRows
        .filter((r) => r.color || r.size || r.sku_variant)
        .map((r) => ({ color: r.color || null, size: r.size || null, sku_variant: r.sku_variant || null }))
    }
    isEdit ? updateMut.mutate(payload) : createMut.mutate(payload)
  }

  const addVariantRow = () =>
    setVariantRows((prev) => [...prev, { color: '', size: '', sku_variant: '' }])
  const removeVariantRow = (i) =>
    setVariantRows((prev) => prev.filter((_, idx) => idx !== i))
  const updateVariantRow = (i, field, val) =>
    setVariantRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const busy = createMut.isPending || updateMut.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* tabs */}
        <div className="flex border-b px-6">
          {['info', 'variants'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 px-4 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              {t === 'info' ? 'Thông tin' : 'Biến thể'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {tab === 'info' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Tên sản phẩm *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`input ${fieldErrors.name ? 'input-error' : ''}`}
                      placeholder="VD: Áo thun nam"
                    />
                    <FieldError error={fieldErrors.name} />
                  </div>
                  <div>
                    <label className="label">SKU</label>
                    <input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      className={`input ${fieldErrors.sku ? 'input-error' : ''}`}
                      placeholder="VD: ATN-001"
                    />
                    <FieldError error={fieldErrors.sku} />
                  </div>
                  <div>
                    <label className="label">Danh mục</label>
                    <input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="input"
                      placeholder="VD: Áo"
                    />
                  </div>
                  <div>
                    <label className="label">
                      Giá vốn {!isOwner && <span className="text-xs text-gray-400">(chỉ owner)</span>}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      disabled={!isOwner}
                      className="input disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="label">Giá bán</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.selling_price}
                      onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Ngưỡng cảnh báo tồn</label>
                    <input
                      type="number"
                      min="0"
                      value={form.low_stock_threshold}
                      onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Nhà cung cấp ID</label>
                    <input
                      type="number"
                      min="1"
                      value={form.supplier_id}
                      onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                      className="input"
                      placeholder="ID nhà CC (tuỳ chọn)"
                    />
                  </div>
                </div>
              </>
            )}

            {tab === 'variants' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Danh sách biến thể</span>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="btn-sm"
                    >
                      + Thêm biến thể
                    </button>
                  )}
                </div>
                {isEdit ? (
                  <p className="text-sm text-gray-500">
                    Để sửa biến thể, dùng tính năng quản lý biến thể trong trang chi tiết sản phẩm.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 pr-2">Màu</th>
                        <th className="pb-2 pr-2">Size</th>
                        <th className="pb-2 pr-2">SKU biến thể</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantRows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-2">
                            <input
                              value={row.color}
                              onChange={(e) => updateVariantRow(i, 'color', e.target.value)}
                              className="input-sm"
                              placeholder="Đỏ"
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              value={row.size}
                              onChange={(e) => updateVariantRow(i, 'size', e.target.value)}
                              className="input-sm"
                              placeholder="M"
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              value={row.sku_variant}
                              onChange={(e) => updateVariantRow(i, 'sku_variant', e.target.value)}
                              className="input-sm"
                              placeholder="ATN-001-DO-M"
                            />
                          </td>
                          <td className="py-1">
                            {variantRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVariantRow(i)}
                                className="text-red-400 hover:text-red-600"
                              >
                                &times;
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Huỷ
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm delete dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <p className="text-gray-800 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">Huỷ</button>
          <button onClick={onConfirm} className="btn-danger">Xoá</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expanded variants row
// ---------------------------------------------------------------------------
function VariantRow({ product, isOwner }) {
  const { data, isLoading } = useQuery({
    queryKey: ['variants', product.id],
    queryFn: () => productService.listVariants(product.id).then((r) => r.data),
  })

  if (isLoading) return <tr><td colSpan={9} className="px-4 py-2 text-sm text-gray-400">Đang tải biến thể...</td></tr>

  return (
    <tr>
      <td colSpan={9} className="bg-gray-50 px-8 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Biến thể</p>
        {data?.length === 0 ? (
          <p className="text-sm text-gray-400">Không có biến thể</p>
        ) : (
          <table className="text-sm w-full">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="pr-4 pb-1">SKU</th>
                <th className="pr-4 pb-1">Màu</th>
                <th className="pr-4 pb-1">Size</th>
                <th className="pr-4 pb-1">Tồn kho</th>
                {isOwner && <th className="pb-1">Giá vốn riêng</th>}
              </tr>
            </thead>
            <tbody>
              {data?.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="pr-4 py-1">{v.sku_variant ?? '—'}</td>
                  <td className="pr-4 py-1">{v.color ?? '—'}</td>
                  <td className="pr-4 py-1">{v.size ?? '—'}</td>
                  <td className="pr-4 py-1">{v.total_quantity}</td>
                  {isOwner && (
                    <td className="py-1">
                      {v.cost_price_override != null
                        ? Number(v.cost_price_override).toLocaleString('vi-VN')
                        : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function fmt(n) {
  return Number(n).toLocaleString('vi-VN')
}

export default function Products() {
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'owner'
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const [modal, setModal] = useState(null) // null | 'add' | product object
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, category, page }],
    queryFn: () =>
      productService.list({ search: search || undefined, category: category || undefined, page }).then((r) => r.data),
    keepPreviousData: true,
  })

  const deleteMut = useMutation({
    mutationFn: (id) => productService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Đã xoá sản phẩm')
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Lỗi khi xoá'),
  })

  const products = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sản phẩm</h1>
        <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Thêm sản phẩm
        </button>
      </div>

      {/* filters */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="input w-64"
          placeholder="Tìm theo tên, SKU..."
        />
        <input
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="input w-48"
          placeholder="Lọc danh mục"
        />
      </div>

      {/* table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Tên sản phẩm</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Giá vốn</th>
              <th className="px-4 py-3">Giá bán</th>
              <th className="px-4 py-3">Tồn kho</th>
              <th className="px-4 py-3">Nhà CC</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">Đang tải...</td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">Không có sản phẩm</td>
              </tr>
            )}
            {products.map((p) => (
              <>
                <tr
                  key={p.id}
                  className={`border-t hover:bg-gray-50 ${!p.is_active ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedId === p.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku ?? '—'}</td>
                  <td className="px-4 py-3">{p.category ?? '—'}</td>
                  <td className="px-4 py-3">{fmt(p.cost_price)}</td>
                  <td className="px-4 py-3">{fmt(p.selling_price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        p.total_quantity <= p.low_stock_threshold
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {p.total_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.supplier?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModal(p)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Sửa"
                      >
                        <Pencil size={15} />
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="text-gray-400 hover:text-red-600"
                          title="Xoá"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <VariantRow key={`variants-${p.id}`} product={p} isOwner={isOwner} />
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} / {meta.total} sản phẩm
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="btn-secondary disabled:opacity-40"
            >
              Trước
            </button>
            <button
              disabled={page >= meta.total_pages}
              onClick={() => setPage(page + 1)}
              className="btn-secondary disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* modals */}
      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          isOwner={isOwner}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Xoá sản phẩm "${deleteTarget.name}"? Hành động này không thể hoàn tác.`}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
