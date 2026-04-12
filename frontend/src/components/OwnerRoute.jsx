import { Navigate, Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../stores/authStore'

export default function OwnerRoute() {
  const user = useAuthStore((s) => s.user)

  if (user && user.role !== 'owner') {
    toast.error('Không có quyền truy cập')
    return <Navigate to="/dashboard" replace />
  }

  // If user is null (not yet loaded but token exists), let ProtectedRoute handle it
  return <Outlet />
}
