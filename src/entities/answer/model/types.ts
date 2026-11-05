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
 * 핵심 인용 근거(docs199-Server PR #62/#67, develop에 병합됨). 최대 3개, 검증 가능한 게 없으면 빈 배열.
 * `source`는 이름과 달리 검증된 문서 제목입니다. 필드 이름·구조는 AI·프론트 합의 전 임시 계약입니다.
 */
export interface AnswerEvidence {
  chunkId: string
  /** 검증된 문서 제목(이름은 source지만 documentTitle과 같은 역할). */
  source: string
  documentId: string
  versionId: string
  /** 근거 문서에서 그대로 발췌한 문구. 답변 아래에 "원문 그대로" 보여주는 용도입니다. */
  quote: string
  /** 문서 본문 기준 유니코드 코드 포인트 위치. 계산할 수 없으면 둘 다 null입니다. */
  charStart: number | null
  charEnd: number | null
}

/** 답변의 핵심 키워드(docs199-Server #78). 근거 청크 원문에 그대로 있는 문구입니다. */
/**
 * LLM의 문서 수정 제안(docs199-AI-v2 editProposals). Spring 전달 합의 전 임시 형식입니다.
 * sample은 개발 서버의 샘플 표시입니다.
 */
export interface AnswerEditProposal {
  chunkId: string
  source: string
  documentId: string
  versionId?: string | null
  before: string
  after: string
  reason: string
  sample?: boolean
  /** 답변이 함께 인용한 문서. 웹이 채우며 충돌 쌍을 고르는 데 씁니다. */
  peerDocumentIds?: string[]
}

export interface AnswerKeyword {
  text: string
  chunkId: string
}

/**
 * 질문 검색 필터(docs199-Server #48). 같은 필드의 배열 값은 OR, 서로 다른 필드는 AND입니다.
 * 빈 배열은 서버가 400으로 거부하므로 보내지 않습니다. AI 서버가 실제로 적용하는지는 아직 미확정입니다.
 */
export interface AskQuestionFilters {
  extensions?: string[]
  documentTypes?: string[]
  sourceKinds?: string[]
  authoredFrom?: string
  authoredTo?: string
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
  evidence: AnswerEvidence[]
  /** Spring이 전달하기 전에는 없을 수 있습니다. */
  keywords?: AnswerKeyword[]
  editProposals?: AnswerEditProposal[]
  failedSources: string[]
  fallbackReason: string | null
}
