import { useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import useAuthStore from '../stores/authStore'
import api from '../services/api'

export function useAuthInit() {
  const { setUser, setHydrated, logout } = useAuthStore()

  useEffect(() => {
    async function init() {
      const token = await SecureStore.getItemAsync('access_token')
      if (!token) {
        setHydrated(true)
        return
      }

      try {
        const res = await api.get('/auth/me')
        setUser(res.data)
      } catch {
        await logout()
      } finally {
        setHydrated(true)
      }
    }
    init()
  }, [])
}
