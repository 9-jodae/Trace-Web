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
// 요청 크기 초과는 서버 앞단(프록시·서블릿)이 응답 봉투 없이 413으로 끊을 수 있습니다.
const PAYLOAD_TOO_LARGE: ApiError = {
  code: 'PAYLOAD_TOO_LARGE',
  message: '업로드 크기 한도를 넘었습니다',
}

/** 응답 봉투에서 data를 꺼내고, 실패는 ApiRequestError로 바꿉니다. */
export function unwrap<T>(status: number, body: ApiResponse<T>): T {
  if (!body.success || body.error) {
    throw new ApiRequestError(status, body.error ?? { code: 'UNKNOWN', message: '알 수 없는 오류' })
  }
  return body.data as T
}

function toApiRequestError(error: AxiosError, data = error.response?.data): ApiRequestError {
  const body = data as ApiResponse<unknown> | undefined
  if (body?.error) return new ApiRequestError(error.response?.status ?? 0, body.error)
  if (error.response?.status === 413) return new ApiRequestError(413, PAYLOAD_TOO_LARGE)
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new ApiRequestError(0, TIMEOUT_ERROR)
  }
  return new ApiRequestError(error.response?.status ?? 0, NETWORK_ERROR)
}

function rejectWith(failure: unknown): never {
  // 토큰이 만료되었거나 무효하면 지웁니다. 인증 가드가 로그인 화면으로 보냅니다.
  if (failure instanceof ApiRequestError && failure.status === 401) {
    useTokenStore.getState().setAccessToken(null)
  }
  throw failure
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    return unwrap(response.status, response.data)
  } catch (error) {
    rejectWith(error instanceof AxiosError ? toApiRequestError(error) : error)
  }
}

/** 파일 요청의 오류 본문은 Blob으로 오므로 JSON 응답 봉투인지 읽어 봅니다. */
async function readErrorBody(error: AxiosError): Promise<unknown> {
  const data = error.response?.data
  if (!(data instanceof Blob)) return data
  try {
    return JSON.parse(await data.text()) as unknown
  } catch {
    return undefined
  }
}

/**
 * 응답 봉투 없이 파일 본문을 그대로 주는 API(원문 다운로드 등)를 Blob으로 받습니다.
 * `request`와 같은 http 클라이언트를 써서 인증 헤더와 기본 주소가 붙고, 오류도 같은 방식으로 바꿉니다.
 */
export async function requestBlob(config: AxiosRequestConfig): Promise<Blob> {
  try {
    const response = await http.request<Blob>({ ...config, responseType: 'blob' })
    return response.data
  } catch (error) {
    rejectWith(
      error instanceof AxiosError ? toApiRequestError(error, await readErrorBody(error)) : error,
    )
  }
}
