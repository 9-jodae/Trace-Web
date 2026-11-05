import { beforeEach, describe, expect, it } from 'vitest'
import type { AnswerEvidence } from '@/entities/answer'
import { resetChatStore, useChatStore } from './chatStore'

const evidence: AnswerEvidence = {
  chunkId: 'c1',
  source: '휴가 규정',
  documentId: 'd1',
  versionId: 'v1',
  quote: '연차는 최대 5일까지 이월할 수 있다',
  charStart: null,
  charEnd: null,
}

describe('chatStore latestEvidence', () => {
  beforeEach(() => resetChatStore())

  it('가장 최근 답변의 인용만 보관하고 새 질문을 하면 비운다', () => {
    const store = useChatStore.getState()
    store.addQuestion('연차 이월?')
    store.addAnswer('conv1', '최대 5일입니다.', [], [evidence])
    expect(useChatStore.getState().latestEvidence).toEqual([evidence])

    useChatStore.getState().addQuestion('다른 질문')
    expect(useChatStore.getState().latestEvidence).toEqual([])
  })

  it('새 대화를 시작하면 비운다', () => {
    useChatStore.getState().addAnswer('conv1', '답변', [], [evidence])
    useChatStore.getState().startNewConversation()
    expect(useChatStore.getState().latestEvidence).toEqual([])
  })
})
