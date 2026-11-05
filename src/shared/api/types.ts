// 서버 공통 응답 형식. docs199-Server의 docs/conventions.md와 맞춥니다.

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiError | null
}

/** 0부터 시작하는 페이지 목록 */
export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
