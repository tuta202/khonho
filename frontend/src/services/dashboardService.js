import api from './api'

export const dashboardService = {
  stats: () => api.get('/api/v1/dashboard/stats'),
  alerts: () => api.get('/api/v1/dashboard/alerts'),
  recent: () => api.get('/api/v1/dashboard/recent'),
}
