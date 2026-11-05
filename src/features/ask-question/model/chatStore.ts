import { create } from 'zustand'
import type { AnswerEvidence, AnswerSource } from '@/entities/answer'

export type ChatMessage =
  | { id: string; kind: 'question'; text: string }
  | {
      id: string
      kind: 'answer'
      text: string
      sources: AnswerSource[]
      evidence: AnswerEvidence[]
    }
  | { id: string; kind: 'error'; text: string }

interface ChatState {
  /** 서버 대화 ID. 첫 답변을 받으면 정해지고, 이후 질문은 같은 대화에 이어서 보냅니다. */
  conversationId: string | null
  /** 이번 화면에서 주고받은 메시지. 질문 API 응답은 다시 조회할 수 없어 여기에 보관합니다. */
  messages: ChatMessage[]
  /** 가장 최근 답변의 근거 문서 ID. 그래프에서 강조합니다. */
  evidenceDocumentIds: string[]
  /** 채팅 헤더의 "관계 그래프" 토글. 꺼두면 근거 강조를 그래프에 반영하지 않습니다. */
  graphHighlightEnabled: boolean
  sequence: number
  /**
   * 지금 대화의 맥락 번호. 새 대화·다른 대화 열기·로그아웃 초기화 때마다 바뀌며, 질문을 보낸 뒤
   * 이 값이 바뀌었으면 늦게 도착한 답변을 버리는 데 씁니다. 첫 답변으로 conversationId가
   * 정해지는 것은 같은 대화라 바꾸지 않습니다.
   */
  contextId: number
  addQuestion: (text: string) => void
  addAnswer: (
    conversationId: string,
    text: string,
    sources: AnswerSource[],
    evidence: AnswerEvidence[],
  ) => void
  addError: (text: string) => void
  startNewConversation: () => void
  toggleGraphHighlight: () => void
  /** 대화 기록에서 과거 대화를 열 때 씁니다. 지금 대화 내용을 통째로 바꿔치기합니다. */
  loadConversation: (conversationId: string, messages: ChatMessage[]) => void
}

// 초기화해도 이전 값으로 돌아가지 않도록 스토어 밖에서 셉니다.
let lastContextId = 0
const nextContextId = () => ++lastContextId

const initialState = {
  conversationId: null,
  messages: [] as ChatMessage[],
  evidenceDocumentIds: [] as string[],
  graphHighlightEnabled: true,
  sequence: 0,
  contextId: 0,
}

export const useChatStore = create<ChatState>()((set) => ({
  ...initialState,

  // 새 질문을 하면 이전 답변의 근거 강조를 지웁니다(기획 확정 사항).
  addQuestion: (text) =>
    set((state) => ({
      sequence: state.sequence + 1,
      evidenceDocumentIds: [],
      messages: [...state.messages, { id: `m${state.sequence + 1}`, kind: 'question', text }],
    })),

  addAnswer: (conversationId, text, sources, evidence) =>
    set((state) => ({
      conversationId,
      sequence: state.sequence + 1,
      evidenceDocumentIds: [...new Set(sources.map((source) => source.documentId))],
      messages: [
        ...state.messages,
        { id: `m${state.sequence + 1}`, kind: 'answer', text, sources, evidence },
      ],
    })),

  addError: (text) =>
    set((state) => ({
      sequence: state.sequence + 1,
      messages: [...state.messages, { id: `m${state.sequence + 1}`, kind: 'error', text }],
    })),

  // 대화 자체를 초기화해도 "관계 그래프" 토글은 화면 설정이라 유지합니다.
  startNewConversation: () =>
    set((state) => ({
      ...initialState,
      contextId: nextContextId(),
      graphHighlightEnabled: state.graphHighlightEnabled,
    })),

  toggleGraphHighlight: () =>
    set((state) => ({ graphHighlightEnabled: !state.graphHighlightEnabled })),

  loadConversation: (conversationId, messages) =>
    set((state) => {
      const lastAnswer = [...messages].reverse().find((message) => message.kind === 'answer')
      const evidenceDocumentIds =
        lastAnswer?.kind === 'answer'
          ? [...new Set(lastAnswer.sources.map((source) => source.documentId))]
          : []
      return {
        conversationId,
        contextId: nextContextId(),
        messages,
        evidenceDocumentIds,
        sequence: state.sequence + messages.length,
      }
    }),
}))

export function resetChatStore() {
  useChatStore.setState({ ...initialState, contextId: nextContextId() })
}
