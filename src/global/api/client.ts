import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useTokenStore } from '@/global/auth/tokenStore'
import type { ApiError, ApiResponse } from '@/global/api/types'

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = error.code
    this.details = error.details
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 30_000,
})

http.interceptors.request.use((config) => {
  const token = useTokenStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const NETWORK_ERROR: ApiError = { code: 'NETWORK_ERROR', message: '서버에 연결할 수 없습니다' }

/** 응답 봉투에서 data를 꺼내고, 실패는 ApiRequestError로 바꿉니다. */
export function unwrap<T>(status: number, body: ApiResponse<T>): T {
  if (!body.success || body.error) {
    throw new ApiRequestError(status, body.error ?? { code: 'UNKNOWN', message: '알 수 없는 오류' })
  }
  return body.data as T
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    return unwrap(response.status, response.data)
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    if (error instanceof AxiosError) {
      const body = error.response?.data as ApiResponse<unknown> | undefined
      throw new ApiRequestError(error.response?.status ?? 0, body?.error ?? NETWORK_ERROR)
    }
    throw error
  }
}
