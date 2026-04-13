// Parse lỗi từ API response → { fieldErrors, generalError }
export function parseApiError(error) {
  const data = error?.response?.data

  // 422 Validation errors (field-level)
  if (error?.response?.status === 422 && data?.errors) {
    return { fieldErrors: data.errors, generalError: data.detail }
  }

  // 4xx Business logic errors
  if (error?.response?.status >= 400 && error?.response?.status < 500) {
    return { fieldErrors: {}, generalError: data?.detail || 'Có lỗi xảy ra' }
  }

  // 5xx
  return { fieldErrors: {}, generalError: 'Lỗi server, vui lòng thử lại' }
}
