export default function ConfirmDialog({ message, onConfirm, onCancel, loading = false, confirmLabel = 'Xoá' }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <p className="text-gray-800 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary" disabled={loading}>Huỷ</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger">
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
