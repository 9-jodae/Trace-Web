import { beforeEach, describe, expect, it } from 'vitest'
import type { AnswerEvidence, AnswerSource } from '@/entities/answer'
import { resetChatStore, useChatStore } from './chatStore'

const source = (documentId: string) =>
  ({ id: `k-${documentId}`, documentId, documentTitle: documentId }) as AnswerSource
const quote = (documentId: string) => ({ chunkId: `k-${documentId}`, documentId }) as AnswerEvidence

function ask(question: string, answer: string) {
  const store = useChatStore.getState()
  store.addQuestion(question)
  store.addAnswer('c1', answer, [source('a'), source('b'), source('c')], [quote('b')])
}

describe('chatStore 그래프 강조', () => {
  beforeEach(() => resetChatStore())

  it('인용한 문서를 앞에 두고 출처 문서를 모두 잇는다', () => {
    ask('연차 알려줘', '연차는 5일입니다.')
    expect(useChatStore.getState().evidenceDocumentIds).toEqual(['b', 'a', 'c'])
  })

  it('답변에 차이가 나와도 질문이 충돌을 묻지 않으면 충돌 강조를 하지 않는다', () => {
    ask('신입사원 연차 정보 알려줘', '두 문서의 수치가 다르게 적혀 있어 충돌 확인이 필요합니다.')
    expect(useChatStore.getState().answerAboutConflict).toBe(false)
  })

  it('충돌을 물으면 충돌 강조를 한다', () => {
    ask('문서 간 충돌 찾아줘', '등록된 충돌 4건입니다.')
    expect(useChatStore.getState().answerAboutConflict).toBe(true)
  })
})
