import { useEffect } from 'react'
import api from '../services/api'
import useAuthStore from '../stores/authStore'

/**
 * Runs once on app mount.
 * If an access_token exists in localStorage, fetch /auth/me to hydrate user.
 * On 401, call logout() to clear stale token.
 * Sets hydrated=true when done so ProtectedRoute knows it's safe to check.
 */
export default function useAuthInit() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const setHydrated = useAuthStore((s) => s.setHydrated)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!accessToken) {
      // No token — hydration is instant
      setHydrated()
      return
    }

    api
      .get('/api/v1/auth/me')
      .then(({ data }) => {
        setUser(data)
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          // Token stale or invalid — the 401 interceptor in api.js will call logout(),
          // but we also call it here directly so hydrated is set before redirect.
          logout()
        }
        // For non-401 errors (network, 5xx) keep the token and let the app try normally
      })
      .finally(() => {
        setHydrated()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount
}
