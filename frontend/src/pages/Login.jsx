import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../stores/authStore'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password })
      login(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Đăng nhập thất bại'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">KhoNhỏ</h1>
          <p className="text-sm text-gray-400 mt-1">Quản lý kho hàng</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={error ? 'input-error' : 'input'}
              placeholder="admin@khonho.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={error ? 'input-error' : 'input'}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <span className="text-red-500 text-sm">⚠</span>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 mt-2"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
