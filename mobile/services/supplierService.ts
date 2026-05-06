import api from './api'

export const supplierService = {
  list: (params?: Record<string, unknown>) => api.get('/suppliers', { params }),
  get: (id: number) => api.get(`/suppliers/${id}`),
  create: (data: unknown) => api.post('/suppliers', data),
  update: (id: number, data: unknown) => api.put(`/suppliers/${id}`, data),
  remove: (id: number) => api.delete(`/suppliers/${id}`),
  history: (id: number, params?: Record<string, unknown>) =>
    api.get(`/suppliers/${id}/history`, { params }),
}
