import api from './api'

export const productService = {
  list: (params?: Record<string, unknown>) => api.get('/products', { params }),
  get: (id: number) => api.get(`/products/${id}`),
  create: (data: unknown) => api.post('/products', data),
  update: (id: number, data: unknown) => api.put(`/products/${id}`, data),
  remove: (id: number) => api.delete(`/products/${id}`),
  listVariants: (productId: number) => api.get(`/products/${productId}/variants`),
  createVariant: (productId: number, data: unknown) =>
    api.post(`/products/${productId}/variants`, data),
  updateVariant: (productId: number, variantId: number, data: unknown) =>
    api.put(`/products/${productId}/variants/${variantId}`, data),
}
