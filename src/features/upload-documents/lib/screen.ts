import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from '@/shared/config'

/** 서버의 제외 규칙과 같은 기준으로 보내기 전에 거른 사유 */
export type ExcludeReason =
  | '숨김 파일'
  | 'Obsidian 설정·휴지통'
  | '지원하지 않는 형식'
  | '20MB 초과'
  | '빈 파일'
  | '같은 경로 중복'

const SYSTEM_FOLDERS = ['.obsidian', '.trash']

/** 보내지 않을 파일이면 사유를, 보낼 파일이면 null을 돌려줍니다. */
export function excludeReason(path: string, size: number): ExcludeReason | null {
  const parts = path.split('/')
  if (parts.some((part) => SYSTEM_FOLDERS.includes(part.toLowerCase()))) {
    return 'Obsidian 설정·휴지통'
  }
  if (parts.some((part) => part.startsWith('.'))) return '숨김 파일'
  const name = parts.at(-1) ?? ''
  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) return '지원하지 않는 형식'
  if (size > MAX_FILE_BYTES) return '20MB 초과'
  if (size === 0) return '빈 파일'
  return null
}
