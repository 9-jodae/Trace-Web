/** 구분자를 /로 통일하고 앞에 붙은 /를 뗍니다. 대소문자와 유니코드 정규화는 손대지 않습니다. */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

/**
 * 고른 파일의 소스 안 상대 경로. 경로가 곧 소스 안 문서 ID라서 같은 폴더를 다시 올리면 같은 경로가 됩니다.
 * - 폴더에서 고른 파일: 맨 앞 폴더(고른 폴더 자체)를 뗍니다. `vault/공통/a.md` → `공통/a.md`
 * - 파일로 고른 파일: 파일명만 씁니다.
 */
export function toSourcePath(rawPath: string, fromFolder: boolean): string {
  const normalized = normalizePath(rawPath)
  if (!fromFolder) return normalized.split('/').at(-1) ?? normalized
  const slash = normalized.indexOf('/')
  return slash === -1 ? normalized : normalized.slice(slash + 1)
}
