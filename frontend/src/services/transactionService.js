import api from './api'

export const transactionService = {
  import: (data) => api.post('/api/v1/transactions/import', data),
  export: (data) => api.post('/api/v1/transactions/export', data),
  transfer: (data) => api.post('/api/v1/transactions/transfer', data),
  list: (params) => api.get('/api/v1/transactions', { params }),
  get: (id) => api.get(`/api/v1/transactions/${id}`),
}
