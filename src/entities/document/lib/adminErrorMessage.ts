import { ApiRequestError, toErrorMessage } from '@/shared/api'

/** 관리 화면 오류 문구. 403과 저장소 오류만 관리 화면에 맞게 바꾸고 나머지는 공통 문구를 씁니다. */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'FORBIDDEN' || error.status === 403) return '문서 관리 권한이 없습니다.'
    if (error.code === 'STORAGE_ERROR') {
      return '파일 저장소 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }
  }
  return toErrorMessage(error)
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiRequestError && (error.status === 404 || error.code === 'NOT_FOUND')
}
