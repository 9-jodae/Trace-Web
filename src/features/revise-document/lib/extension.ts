/** 파일명의 확장자(소문자, 점 없음). 없으면 빈 문자열 */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** 개정 파일이 현재 문서와 같은 형식인지(대소문자 무시) */
export function hasSameExtension(fileName: string, documentExtension: string): boolean {
  return fileExtension(fileName) === documentExtension.toLowerCase().replace(/^\./, '')
}
