import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export interface User {
  id: number
  email: string
  full_name: string
  role: string
  warehouse_id?: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  user: User
}

interface AuthState {
  user: User | null
  accessToken: string | null
  hydrated: boolean
  login: (tokenResponse: TokenResponse) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
  setHydrated: (val: boolean) => void
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,

  login: async (tokenResponse: TokenResponse) => {
    await SecureStore.setItemAsync(ACCESS_KEY, tokenResponse.access_token)
    await SecureStore.setItemAsync(REFRESH_KEY, tokenResponse.refresh_token)
    set({
      accessToken: tokenResponse.access_token,
      user: tokenResponse.user,
      hydrated: true,
    })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
    set({ accessToken: null, user: null, hydrated: true })
    router.replace('/(auth)/login')
  },

  setUser: (user: User) => set({ user }),
  setHydrated: (val: boolean) => set({ hydrated: val }),
}))

export default useAuthStore
