import api from './api'

export const transactionService = {
  import: (data: unknown) => api.post('/transactions/import', data),
  export: (data: unknown) => api.post('/transactions/export', data),
  transfer: (data: unknown) => api.post('/transactions/transfer', data),
  list: (params?: Record<string, unknown>) => api.get('/transactions', { params }),
}
