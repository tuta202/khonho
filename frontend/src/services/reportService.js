import api from './api'

export const reportService = {
  inventorySnapshot: (params) => api.get('/api/v1/reports/inventory-snapshot', { params }),
  transactionsSummary: (params) => api.get('/api/v1/reports/transactions-summary', { params }),
  inventoryValue: () => api.get('/api/v1/reports/inventory-value'),
}

export async function exportReport(endpoint, params, filename) {
  const response = await api.get(endpoint, {
    params,
    responseType: 'blob',
  })

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
