import { create } from 'zustand'
import type {
  AnswerEditProposal,
  AnswerEvidence,
  AnswerKeyword,
  AnswerSource,
} from '@/entities/answer'

/** 충돌을 다루는 답변의 표현. 글자로 판단하므로 가끔 틀릴 수 있습니다. */
const CONFLICT_ANSWER = /(충돌|모순|일치하지 않|서로 다|값이 다|수치가 다|수정안|수정을 제안)/

/** createdAt은 말풍선 옆 시각 표시용 ISO 문자열입니다. 없으면 시각을 그리지 않습니다. */
export type ChatMessage =
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
      keywords?: AnswerKeyword[]
      editProposals?: AnswerEditProposal[]
    }
  | { id: string; kind: 'error'; text: string; createdAt?: string }

interface ChatState {
  /** 서버 대화 ID. 첫 답변을 받으면 정해지고, 이후 질문은 같은 대화에 이어서 보냅니다. */
  conversationId: string | null
  /** 이번 화면에서 주고받은 메시지. 질문 API 응답은 다시 조회할 수 없어 여기에 보관합니다. */
  messages: ChatMessage[]
  /** 가장 최근 답변의 근거 문서 ID. 그래프에서 강조합니다. */
  evidenceDocumentIds: string[]
  /** 가장 최근 답변이 문서 충돌이나 수정을 다루는지. 그래프가 충돌 쌍만 강조할지 정합니다. */
  answerAboutConflict: boolean
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
    keywords?: AnswerKeyword[],
    editProposals?: AnswerEditProposal[],
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
const now = () => new Date().toISOString()

const initialState = {
  conversationId: null,
  messages: [] as ChatMessage[],
  evidenceDocumentIds: [] as string[],
  answerAboutConflict: false,
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
      messages: [
        ...state.messages,
        { id: `m${state.sequence + 1}`, kind: 'question', text, createdAt: now() },
      ],
    })),

  addAnswer: (conversationId, text, sources, evidence, keywords = [], editProposals = []) =>
    set((state) => ({
      conversationId,
      sequence: state.sequence + 1,
      answerAboutConflict: editProposals.length > 0 || CONFLICT_ANSWER.test(text),
      // 답변이 실제로 인용한 문서만 강조합니다. 검색에 걸렸을 뿐인 문서까지 키우면 관련 없어 보입니다.
      evidenceDocumentIds: [
        ...new Set((evidence.length > 0 ? evidence : sources).map((item) => item.documentId)),
      ],
      messages: [
        ...state.messages,
        {
          id: `m${state.sequence + 1}`,
          kind: 'answer',
          text,
          sources,
          evidence,
          keywords,
          editProposals,
          createdAt: now(),
        },
      ],
    })),

  addError: (text) =>
    set((state) => ({
      sequence: state.sequence + 1,
      messages: [
        ...state.messages,
        { id: `m${state.sequence + 1}`, kind: 'error', text, createdAt: now() },
      ],
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
        answerAboutConflict: lastAnswer?.kind === 'answer' && CONFLICT_ANSWER.test(lastAnswer.text),
        sequence: state.sequence + messages.length,
      }
    }),
}))

export function resetChatStore() {
  useChatStore.setState({ ...initialState, contextId: nextContextId() })
}
