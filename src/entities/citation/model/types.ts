import type { Document } from '@/entities/document/@x/citation'

/** 답변 문장 하나가 가리키는 원문 위치 */
export interface Citation {
  id: string
  documentId: Document['id']
  documentTitle: Document['title']
  /** 개정 후 폐지된 버전을 가리키지 않도록 버전 고정 */
  version: number
  page?: number
  paragraph?: number
  /** 원문 텍스트 내 문자 오프셋 */
  range: { start: number; end: number }
  quote: string
}
