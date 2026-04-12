import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Warehouse as WarehouseIcon, ArrowLeft, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { warehouseService } from '../services/warehouseService'
import useAuthStore from '../stores/authStore'

// ---------------------------------------------------------------------------
// Warehouse modal — add / edit
// ---------------------------------------------------------------------------
function WarehouseModal({ warehouse, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!warehouse

  const [form, setForm] = useState({
    name: warehouse?.name ?? '',
    location: warehouse?.location ?? '',
  })

  const createMut = useMutation({
    mutationFn: (data) => warehouseService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Thêm kho thành công')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Lỗi khi thêm kho'),
  })

  const updateMut = useMutation({
    mutationFn: (data) => warehouseService.update(warehouse.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Cập nhật kho thành công')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Lỗi khi cập nhật'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      location: form.location || null,
    }
    isEdit ? updateMut.mutate(payload) : createMut.mutate(payload)
  }

  const busy = createMut.isPending || updateMut.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{isEdit ? 'Sửa kho' : 'Thêm kho'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Tên kho *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="VD: Kho phụ"
            />
          </div>
          <div>
            <label className="label">Địa chỉ / Vị trí</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input"
              placeholder="VD: Tầng 2, cửa hàng B"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Huỷ</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm kho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inventory detail panel for a single warehouse
// ---------------------------------------------------------------------------
function InventoryPanel({ warehouse, onBack, isOwner }) {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-inventory', warehouse.id, search],
    queryFn: () =>
      warehouseService
        .inventory(warehouse.id, { search: search || undefined })
        .then((r) => r.data),
  })

  return (
    <div>
      {/* sub-header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{warehouse.name}</h2>
          {warehouse.location && (
            <p className="text-sm text-gray-500">{warehouse.location}</p>
          )}
        </div>
        {data && (
          <div className="ml-auto flex gap-4 text-sm">
            <span className="text-gray-600">
              <span className="font-semibold">{data.total_items}</span> loại hàng
            </span>
            {data.low_stock_count > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle size={14} />
                {data.low_stock_count} sắp hết
              </span>
            )}
          </div>
        )}
      </div>

      {/* search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-72"
          placeholder="Tìm theo tên sản phẩm..."
        />
      </div>

      {/* table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Màu</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Số lượng</th>
              {isOwner && <th className="px-4 py-3">Giá vốn</th>}
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isOwner ? 6 : 5} className="px-4 py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 6 : 5} className="px-4 py-6 text-center text-gray-400">
                  Kho trống
                </td>
              </tr>
            )}
            {data?.items?.map((item) => (
              <tr key={item.variant_id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.product_name}</td>
                <td className="px-4 py-3 text-gray-500">{item.color ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{item.size ?? '—'}</td>
                <td className="px-4 py-3 font-semibold">{item.quantity}</td>
                {isOwner && (
                  <td className="px-4 py-3">
                    {Number(item.cost_price).toLocaleString('vi-VN')}
                  </td>
                )}
                <td className="px-4 py-3">
                  {item.is_low_stock ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      <AlertTriangle size={11} />
                      Sắp hết
                    </span>
                  ) : (
                    <span className="inline-flex bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
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
// Warehouse card
// ---------------------------------------------------------------------------
function WarehouseCard({ warehouse, onSelect, onEdit, onDelete, isOwner }) {
  const { data } = useQuery({
    queryKey: ['warehouse-inventory', warehouse.id, ''],
    queryFn: () =>
      warehouseService.inventory(warehouse.id).then((r) => r.data),
  })

  const totalQty = data?.items?.reduce((s, i) => s + i.quantity, 0) ?? '—'
  const itemCount = data?.total_items ?? '—'
  const lowCount = data?.low_stock_count ?? 0

  return (
    <div
      onClick={() => onSelect(warehouse)}
      className="bg-white border rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 rounded-lg p-2">
            <WarehouseIcon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{warehouse.name}</h3>
            {warehouse.location && (
              <p className="text-xs text-gray-400">{warehouse.location}</p>
            )}
          </div>
        </div>
        {isOwner && (
          <div
            className="flex gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onEdit(warehouse)}
              className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 border rounded"
            >
              Sửa
            </button>
            <button
              onClick={() => onDelete(warehouse)}
              className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 border rounded"
            >
              Xoá
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">Loại hàng</div>
          <div className="font-bold text-gray-800">{itemCount}</div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">Tổng tồn kho</div>
          <div className="font-bold text-gray-800">{totalQty}</div>
        </div>
      </div>

      {lowCount > 0 && (
        <div className="mt-3 flex items-center gap-1 text-xs text-red-600 font-medium">
          <AlertTriangle size={12} />
          {lowCount} mặt hàng sắp hết
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete confirm
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
export default function Warehouses() {
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'owner'
  const qc = useQueryClient()

  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [modal, setModal] = useState(null) // null | 'add' | warehouse object
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseService.list().then((r) => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => warehouseService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Đã xoá kho')
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail ?? 'Lỗi khi xoá kho')
      setDeleteTarget(null)
    },
  })

  if (selectedWarehouse) {
    return (
      <div className="p-6">
        <InventoryPanel
          warehouse={selectedWarehouse}
          onBack={() => setSelectedWarehouse(null)}
          isOwner={isOwner}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Kho</h1>
        {isOwner && (
          <button
            onClick={() => setModal('add')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Thêm kho
          </button>
        )}
      </div>

      {isLoading && (
        <p className="text-gray-400">Đang tải...</p>
      )}

      {!isLoading && warehouses.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <WarehouseIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p>Chưa có kho nào</p>
        </div>
      )}

      {/* warehouse cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((wh) => (
          <WarehouseCard
            key={wh.id}
            warehouse={wh}
            onSelect={setSelectedWarehouse}
            onEdit={(w) => setModal(w)}
            onDelete={setDeleteTarget}
            isOwner={isOwner}
          />
        ))}
      </div>

      {/* modals */}
      {modal && (
        <WarehouseModal
          warehouse={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Xoá kho "${deleteTarget.name}"? Kho phải trống (tồn kho = 0) mới xoá được.`}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
