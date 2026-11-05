import type { AnswerEvidence, AnswerSource } from '@/entities/answer'

/**
 * features/ask-question의 ChatMessage와 구조만 같게 둡니다(FSD 규칙상 같은 레이어 feature를
 * 서로 import할 수 없어서). 과거 대화를 열 때 widget이 이 배열을 그대로 chatStore에 넘깁니다.
 */
export type ReconstructedMessage =
  | { id: string; kind: 'question'; text: string; createdAt?: string }
  | {
      id: string
      kind: 'answer'
      createdAt?: string
      text: string
      sources: AnswerSource[]
      evidence: AnswerEvidence[]
      /** 과거 대화를 다시 열 때 문서 삭제·개정·권한 변경으로 불러오지 못한 근거 수. 있을 때만 둡니다. */
      missingSourceCount?: number
    }
