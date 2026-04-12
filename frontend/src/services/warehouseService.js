import api from './api'

export const warehouseService = {
  list: () => api.get('/api/v1/warehouses'),
  create: (data) => api.post('/api/v1/warehouses', data),
  update: (id, data) => api.put(`/api/v1/warehouses/${id}`, data),
  remove: (id) => api.delete(`/api/v1/warehouses/${id}`),
  inventory: (id, params) => api.get(`/api/v1/warehouses/${id}/inventory`, { params }),
  summary: () => api.get('/api/v1/warehouses/summary'),
}
