import api from './api'

export const productService = {
  list: (params) => api.get('/api/v1/products', { params }),
  get: (id) => api.get(`/api/v1/products/${id}`),
  create: (data) => api.post('/api/v1/products', data),
  update: (id, data) => api.put(`/api/v1/products/${id}`, data),
  remove: (id) => api.delete(`/api/v1/products/${id}`),

  listVariants: (productId) => api.get(`/api/v1/products/${productId}/variants`),
  createVariant: (productId, data) => api.post(`/api/v1/products/${productId}/variants`, data),
  updateVariant: (productId, variantId, data) =>
    api.put(`/api/v1/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId, variantId) =>
    api.delete(`/api/v1/products/${productId}/variants/${variantId}`),
}
