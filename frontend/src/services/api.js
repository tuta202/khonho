import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      toast.error('Phiên đăng nhập hết hạn')
      // Import lazily to avoid circular dependency
      import('../stores/authStore').then(({ default: useAuthStore }) => {
        useAuthStore.getState().logout()
      })
    } else if (status >= 500) {
      toast.error('Lỗi server, thử lại sau')
    }

    return Promise.reject(error)
  },
)

export default api
