// Trace-Server의 대화 API(GET /api/conversations, GET /api/conversations/{id})와 맞춥니다.

export interface ConversationSummary {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type MessageRole = 'USER' | 'ASSISTANT'

export interface ConversationMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  /** 근거 청크 ID 목록. 문서 제목 등은 GET /api/evidence/{chunkId}로 따로 조회해야 합니다. */
  evidenceChunkIds: string[]
  createdAt: string
}

export interface ConversationDetail {
  conversation: ConversationSummary
  messages: ConversationMessage[]
}
