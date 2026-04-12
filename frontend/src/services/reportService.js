import api from './api'

export const reportService = {
  inventorySnapshot: (params) => api.get('/api/v1/reports/inventory-snapshot', { params }),
  transactionsSummary: (params) => api.get('/api/v1/reports/transactions-summary', { params }),
  inventoryValue: () => api.get('/api/v1/reports/inventory-value'),
}
