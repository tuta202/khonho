import api from './api'

export const userService = {
  list: () => api.get('/api/v1/users'),
  create: (data) => api.post('/api/v1/users', data),
  update: (id, data) => api.put(`/api/v1/users/${id}`, data),
  toggle: (id) => api.put(`/api/v1/users/${id}/toggle`),
  changePassword: (data) => api.put('/api/v1/users/me/password', data),
}
