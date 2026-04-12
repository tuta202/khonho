import { Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import OwnerRoute from './components/OwnerRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Warehouses from './pages/Warehouses'
import Transactions from './pages/Transactions'
import Suppliers from './pages/Suppliers'
import Reports from './pages/Reports'
import Users from './pages/Users'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — all authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/products"     element={<Products />} />
          <Route path="/warehouses"   element={<Warehouses />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/suppliers"    element={<Suppliers />} />
          <Route path="/reports"      element={<Reports />} />

          {/* Owner only */}
          <Route element={<OwnerRoute />}>
            <Route path="/users" element={<Users />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
