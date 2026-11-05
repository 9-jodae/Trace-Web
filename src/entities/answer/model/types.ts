// docs199-Server의 QuestionResponse(POST /api/conversations/messages)와 맞춥니다.

/** 답변의 근거 청크. 사용자가 볼 수 없는 문서의 출처는 서버가 미리 제외합니다. */
export interface AnswerSource {
  /** 청크 ID. 근거 조회 API(GET /api/evidence/{chunkId})에 그대로 씁니다. */
  id: string
  text: string
  source: string
  documentId: string
  documentTitle: string
  versionId: string | null
  /** 청크 텍스트 안에서의 하이라이트 위치. PDF 등은 null일 수 있습니다. */
  charStart: number | null
  charEnd: number | null
}

/**
 * route, contextProbability, failedSources, fallbackReason의 값과 의미는 서버·AI 계약에
 * 아직 정해지지 않아 화면에서 해석하지 않습니다(docs/architecture.md 결정 필요 참고).
 */
export interface Answer {
  conversationId: string
  answer: string
  route: string | null
  contextProbability: number | null
  sources: AnswerSource[]
  failedSources: string[]
  fallbackReason: string | null
}
