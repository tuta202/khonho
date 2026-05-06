import api from './api'

export const reportService = {
  inventorySnapshot: (params?: Record<string, unknown>) =>
    api.get('/reports/inventory-snapshot', { params }),
  transactionsSummary: (params?: Record<string, unknown>) =>
    api.get('/reports/transactions-summary', { params }),
  inventoryValue: () => api.get('/reports/inventory-value'),
}
