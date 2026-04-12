import { create } from 'zustand'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

const useAuthStore = create((set) => ({
  accessToken: localStorage.getItem(ACCESS_KEY) || null,
  user: null,

  login: (tokenResponse) => {
    localStorage.setItem(ACCESS_KEY, tokenResponse.access_token)
    localStorage.setItem(REFRESH_KEY, tokenResponse.refresh_token)
    set({
      accessToken: tokenResponse.access_token,
      user: tokenResponse.user,
    })
  },

  logout: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    set({ accessToken: null, user: null })
    window.location.href = '/login'
  },

  setUser: (user) => set({ user }),
}))

export default useAuthStore
