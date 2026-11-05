import { ApiRequestError } from './client'

/**
 * INVALID_INPUT 응답의 details(`[{ field, message }]`)를 필드 이름별 문구로 바꿉니다.
 * details가 없거나 형식이 다르면 빈 객체를 돌려줍니다.
 */
export function toFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiRequestError) || !Array.isArray(error.details)) return {}
  const result: Record<string, string> = {}
  for (const item of error.details as unknown[]) {
    if (typeof item !== 'object' || item === null) continue
    const { field, message } = item as { field?: unknown; message?: unknown }
    if (typeof field === 'string' && typeof message === 'string') result[field] = message
  }
  return result
}
