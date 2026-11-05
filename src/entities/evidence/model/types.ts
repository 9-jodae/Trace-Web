// docs199-Server의 근거 조회 API(GET /api/evidence/{chunkId})와 맞춥니다.

export interface EvidenceChunk {
  chunkId: string
  documentId: string
  documentTitle: string
  extension: string
  versionId: string
  versionNumber: number
  content: string
  /** content 안에서 하이라이트할 위치. PDF 등은 null일 수 있습니다. */
  charStart: number | null
  charEnd: number | null
  page: number | null
  previousChunk: string | null
  nextChunk: string | null
  /** 15분짜리 presigned URL. 화면에 노출·로그 금지. */
  downloadUrl: string
}
