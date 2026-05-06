export interface ApiError {
  fieldErrors: Record<string, string>
  generalError: string
}

export function parseApiError(error: unknown): ApiError {
  const err = error as { response?: { status?: number; data?: { errors?: Record<string, string>; detail?: string } } }
  const data = err?.response?.data
  const status = err?.response?.status

  if (status === 422 && data?.errors) {
    return { fieldErrors: data.errors, generalError: data.detail ?? 'Dữ liệu không hợp lệ' }
  }

  if (status !== undefined && status >= 400 && status < 500) {
    return { fieldErrors: {}, generalError: data?.detail ?? 'Có lỗi xảy ra' }
  }

  return { fieldErrors: {}, generalError: 'Lỗi server, vui lòng thử lại' }
}
