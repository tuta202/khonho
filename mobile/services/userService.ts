import api from './api'

export const userService = {
  list: () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  toggle: (id: number) => api.put(`/users/${id}/toggle`),
  changePassword: (data: unknown) => api.put('/users/me/password', data),
}
