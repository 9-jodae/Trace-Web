import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/shared/config'
import { useTokenStore } from './token'
import type { ApiError, ApiResponse } from './types'

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
  baseURL: API_BASE_URL,
  timeout: 30_000,
})

http.interceptors.request.use((config) => {
  const token = useTokenStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const NETWORK_ERROR: ApiError = { code: 'NETWORK_ERROR', message: '서버에 연결할 수 없습니다' }
const TIMEOUT_ERROR: ApiError = { code: 'TIMEOUT', message: '응답 시간이 초과되었습니다' }

/** 응답 봉투에서 data를 꺼내고, 실패는 ApiRequestError로 바꿉니다. */
export function unwrap<T>(status: number, body: ApiResponse<T>): T {
  if (!body.success || body.error) {
    throw new ApiRequestError(status, body.error ?? { code: 'UNKNOWN', message: '알 수 없는 오류' })
  }
  return body.data as T
}

function toApiRequestError(error: AxiosError): ApiRequestError {
  const body = error.response?.data as ApiResponse<unknown> | undefined
  if (body?.error) return new ApiRequestError(error.response?.status ?? 0, body.error)
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new ApiRequestError(0, TIMEOUT_ERROR)
  }
  return new ApiRequestError(error.response?.status ?? 0, NETWORK_ERROR)
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    return unwrap(response.status, response.data)
  } catch (error) {
    const failure =
      error instanceof AxiosError ? toApiRequestError(error) : (error as Error | ApiRequestError)
    // 토큰이 만료되었거나 무효하면 지웁니다. 인증 가드가 로그인 화면으로 보냅니다.
    if (failure instanceof ApiRequestError && failure.status === 401) {
      useTokenStore.getState().setAccessToken(null)
    }
    throw failure
  }
}
