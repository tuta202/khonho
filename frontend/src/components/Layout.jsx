import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowRightLeft,
  Building2,
  BarChart2,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../stores/authStore'
import ErrorBoundary from './ErrorBoundary'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products',     icon: Package,          label: 'Sản phẩm' },
  { to: '/warehouses',   icon: Warehouse,        label: 'Kho hàng' },
  { to: '/transactions', icon: ArrowRightLeft,   label: 'Nhập / Xuất' },
  { to: '/suppliers',    icon: Building2,        label: 'Nhà CC' },
  { to: '/reports',      icon: BarChart2,        label: 'Báo cáo' },
]

const OWNER_ITEMS = [
  { to: '/users', icon: Users, label: 'Người dùng' },
]

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <Icon size={18} className="flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isOwner = user?.role === 'owner'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    toast.success('Đã đăng xuất')
    logout()
  }

  const closeSidebar = () => setSidebarOpen(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <span className="text-xl font-bold text-blue-600">KhoNhỏ</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onClick={closeSidebar} />
        ))}

        {isOwner && (
          <>
            <div className="my-2 border-t" />
            {OWNER_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} onClick={closeSidebar} />
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 w-full px-1"
        >
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-white border-r">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={closeSidebar}
          />
          <aside className="relative z-50 flex flex-col w-60 bg-white border-r shadow-xl">
            <button
              onClick={closeSidebar}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={22} />
          </button>
          <div className="md:hidden font-bold text-blue-600 text-lg">KhoNhỏ</div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{user?.name}</span>
            <span className="text-gray-300">·</span>
            <span className="capitalize text-gray-400">{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600"
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
