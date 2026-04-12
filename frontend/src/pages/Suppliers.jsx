import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ArrowLeft, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { supplierService } from '../services/supplierService'
import useAuthStore from '../stores/authStore'

// ---------------------------------------------------------------------------
// Supplier modal — add / edit
// ---------------------------------------------------------------------------
function SupplierModal({ supplier, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!supplier

  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
    note: supplier?.note ?? '',
  })

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const createMut = useMutation({
    mutationFn: (data) => supplierService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Thêm nhà cung cấp thành công')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Lỗi khi thêm NCC'),
  })

  const updateMut = useMutation({
    mutationFn: (data) => supplierService.update(supplier.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Cập nhật thành công')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Lỗi khi cập nhật'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      note: form.note || null,
    }
    isEdit ? updateMut.mutate(payload) : createMut.mutate(payload)
  }

  const busy = createMut.isPending || updateMut.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Tên nhà cung cấp *</label>
            <input required value={form.name} onChange={f('name')} className="input" placeholder="VD: Công ty ABC" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Điện thoại</label>
              <input value={form.phone} onChange={f('phone')} className="input" placeholder="0901234567" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={f('email')} className="input" placeholder="contact@abc.vn" />
            </div>
          </div>
          <div>
            <label className="label">Địa chỉ</label>
            <input value={form.address} onChange={f('address')} className="input" placeholder="123 Đường ABC, Q.1, TP.HCM" />
          </div>
          <div>
            <label className="label">Ghi chú</label>
            <textarea value={form.note} onChange={f('note')} className="input" rows={2} placeholder="Ghi chú thêm..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Huỷ</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm NCC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Supplier history panel
// ---------------------------------------------------------------------------
function HistoryPanel({ supplier, onBack }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-history', supplier.id, dateFrom, dateTo, page],
    queryFn: () =>
      supplierService
        .history(supplier.id, {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          per_page: 20,
        })
        .then((r) => r.data),
  })

  const items = data?.items ?? []
  const meta = data?.meta

  function fmtDate(iso) {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{supplier.name}</h2>
          <p className="text-sm text-gray-500">Lịch sử nhập hàng</p>
        </div>
      </div>

      {/* date filters */}
      <div className="flex gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="input w-40" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="input w-40" />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Biến thể</th>
              <th className="px-4 py-3">Số lượng</th>
              <th className="px-4 py-3">Kho nhập</th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Chưa có lịch sử nhập hàng</td></tr>
            )}
            {items.map((item) => {
              const variantLabel = [item.variant_color, item.variant_size].filter(Boolean).join(' / ') || 'Mặc định'
              return (
                <tr key={item.transaction_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(item.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{variantLabel}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">+{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{item.warehouse_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{item.note ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} / {meta.total}</span>
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
// Confirm delete
// ---------------------------------------------------------------------------
function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <p className="text-gray-800 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">Huỷ</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger">
            {loading ? 'Đang xoá...' : 'Xoá'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Suppliers() {
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'owner'
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | supplier object
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [historySupplier, setHistorySupplier] = useState(null)

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () =>
      supplierService.list({ search: search || undefined }).then((r) => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => supplierService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Đã xoá nhà cung cấp')
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail ?? 'Lỗi khi xoá')
      setDeleteTarget(null)
    },
  })

  if (historySupplier) {
    return (
      <div className="p-6">
        <HistoryPanel supplier={historySupplier} onBack={() => setHistorySupplier(null)} />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Nhà cung cấp</h1>
        <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Thêm NCC
        </button>
      </div>

      {/* search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-72"
          placeholder="Tìm theo tên, SĐT, email..."
        />
      </div>

      {/* table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Tên nhà cung cấp</th>
              <th className="px-4 py-3">Điện thoại</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Địa chỉ</th>
              <th className="px-4 py-3">Số sản phẩm</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && suppliers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Chưa có nhà cung cấp</td></tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    onClick={() => setHistorySupplier(s)}
                    className="font-medium text-blue-600 hover:underline text-left"
                  >
                    {s.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{s.address ?? '—'}</td>
                <td className="px-4 py-3">{s.product_count}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistorySupplier(s)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Lịch sử nhập"
                    >
                      <History size={15} />
                    </button>
                    <button
                      onClick={() => setModal(s)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Sửa"
                    >
                      <Pencil size={15} />
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="text-gray-400 hover:text-red-600"
                        title="Xoá"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* modals */}
      {modal && (
        <SupplierModal
          supplier={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Xoá nhà cung cấp "${deleteTarget.name}"? Các sản phẩm liên kết sẽ không bị xoá.`}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
