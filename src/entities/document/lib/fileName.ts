import type { Document } from '../model/types'

/**
 * 내려받을 때 쓸 파일 이름. 상대 경로의 마지막 부분이 업로드한 원래 파일 이름입니다.
 * 경로가 비어 있으면 제목과 확장자로 만듭니다.
 */
export function documentFileName(document: Pick<Document, 'relativePath' | 'title' | 'extension'>) {
  const base = document.relativePath.split('/').pop()?.trim()
  if (base) return base
  const extension = document.extension.replace(/^\./, '')
  return extension ? `${document.title}.${extension}` : document.title
}
