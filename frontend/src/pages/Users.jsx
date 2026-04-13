import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { userService } from '../services/userService'
import useAuthStore from '../stores/authStore'
import { parseApiError } from '../utils/errorHandler'
import { FieldError } from '../components/ui/FieldError'

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------
function RoleBadge({ role }) {
  return role === 'owner' ? (
    <span className="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
      Owner
    </span>
  ) : (
    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
      Staff
    </span>
  )
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// User modal — create / edit
// ---------------------------------------------------------------------------
function UserModal({ user, onClose, currentUserId }) {
  const qc = useQueryClient()
  const isEdit = !!user

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'staff',
  })
  const [errors, setErrors] = useState({})

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Bắt buộc'
    if (!isEdit && !form.email.trim()) errs.email = 'Bắt buộc'
    if (!isEdit && form.password.length < 8) errs.password = 'Ít nhất 8 ký tự'
    return errs
  }

  const createMut = useMutation({
    mutationFn: (data) => userService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Tạo tài khoản thành công')
      onClose()
    },
    onError: (err) => {
      const { fieldErrors: fe, generalError } = parseApiError(err)
      setErrors((prev) => ({ ...prev, ...fe }))
      if (generalError) toast.error(generalError)
    },
  })

  const updateMut = useMutation({
    mutationFn: (data) => userService.update(user.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Cập nhật thành công')
      onClose()
    },
    onError: (err) => {
      const { fieldErrors: fe, generalError } = parseApiError(err)
      setErrors((prev) => ({ ...prev, ...fe }))
      if (generalError) toast.error(generalError)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    if (isEdit) {
      const payload = { name: form.name, email: form.email }
      // Only include role if not editing self
      if (user.id !== currentUserId) payload.role = form.role
      updateMut.mutate(payload)
    } else {
      createMut.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      })
    }
  }

  const busy = createMut.isPending || updateMut.isPending
  const isSelf = isEdit && user.id === currentUserId

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Sửa tài khoản' : 'Tạo tài khoản'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Họ tên *</label>
            <input value={form.name} onChange={f('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Nguyễn Văn A" />
            <FieldError error={errors.name} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={f('email')}
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="nv@example.com"
              disabled={isEdit}
            />
            <FieldError error={errors.email} />
          </div>
          {!isEdit && (
            <div>
              <label className="label">Mật khẩu *</label>
              <input
                type="password"
                value={form.password}
                onChange={f('password')}
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="Ít nhất 8 ký tự"
              />
              <FieldError error={errors.password} />
            </div>
          )}
          <div>
            <label className="label">
              Role {isSelf && <span className="text-xs text-gray-400">(không thể sửa của mình)</span>}
            </label>
            <select
              value={form.role}
              onChange={f('role')}
              disabled={isSelf}
              className="input disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="staff">Staff</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Huỷ</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page — owner only
// ---------------------------------------------------------------------------
export default function Users() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  // Route guard — redirect staff away
  if (user?.role !== 'owner') {
    return <Navigate to="/dashboard" replace />
  }

  const [modal, setModal] = useState(null) // null | 'add' | user object

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then((r) => r.data),
  })

  const toggleMut = useMutation({
    mutationFn: (id) => userService.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Lỗi khi thay đổi trạng thái'),
  })

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý tài khoản</h1>
        <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Tạo tài khoản
        </button>
      </div>

      {/* table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Không có tài khoản</td></tr>
            )}
            {users.map((u) => {
              const isSelf = u.id === user?.id
              return (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {isSelf && <span className="ml-2 text-xs text-gray-400">(bạn)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={u.is_active}
                      onChange={() => toggleMut.mutate(u.id)}
                      disabled={isSelf || toggleMut.isPending}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal(u)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Sửa"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <UserModal
          user={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          currentUserId={user?.id}
        />
      )}
    </div>
  )
}
