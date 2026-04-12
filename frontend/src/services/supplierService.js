import api from './api'

export const supplierService = {
  list: (params) => api.get('/api/v1/suppliers', { params }),
  get: (id) => api.get(`/api/v1/suppliers/${id}`),
  create: (data) => api.post('/api/v1/suppliers', data),
  update: (id, data) => api.put(`/api/v1/suppliers/${id}`, data),
  remove: (id) => api.delete(`/api/v1/suppliers/${id}`),
  history: (id, params) => api.get(`/api/v1/suppliers/${id}/history`, { params }),
}
