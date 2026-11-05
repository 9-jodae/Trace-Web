import { ApiRequestError } from './client'

// 서버 오류 코드(docs199-Server docs/api-guide.md)별로 화면에 보여줄 문구입니다.
// 목록에 없는 코드와 INVALID_INPUT은 서버가 보낸 message를 그대로 씁니다.
const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  FORBIDDEN: '이 작업을 할 권한이 없습니다.',
  NOT_FOUND: '찾을 수 없거나 볼 수 있는 권한이 없습니다.',
  STORAGE_ERROR: '파일 저장소에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  AI_UNAVAILABLE: 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  NETWORK_ERROR: '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
  TIMEOUT: '응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
}

const UNKNOWN = '알 수 없는 오류가 발생했습니다.'

/** 오류를 사용자에게 보여줄 한국어 문구로 바꿉니다. */
export function toErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return UNKNOWN
  return MESSAGES[error.code] ?? (error.message || UNKNOWN)
}
