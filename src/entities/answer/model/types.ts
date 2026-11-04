import type { Citation } from '@/entities/citation/@x/answer'

export interface AnswerSentence {
  text: string
  citationIds: string[]
}

/** "찾을 수 없음"과 "검색 불필요 질문"도 에러가 아니라 정상 상태로 표현 */
export type Answer =
  | { status: 'answered'; sentences: AnswerSentence[]; citations: Citation[] }
  | { status: 'not_found'; message: string }
  | { status: 'small_talk'; message: string } // 미리 설정된 구문
