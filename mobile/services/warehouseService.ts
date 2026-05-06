import api from './api'

export const warehouseService = {
  list: () => api.get('/warehouses'),
  create: (data: unknown) => api.post('/warehouses', data),
  update: (id: number, data: unknown) => api.put(`/warehouses/${id}`, data),
  remove: (id: number) => api.delete(`/warehouses/${id}`),
  inventory: (id: number, params?: Record<string, unknown>) =>
    api.get(`/warehouses/${id}/inventory`, { params }),
}
