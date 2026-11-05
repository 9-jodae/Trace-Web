// docs199-Server의 EvidenceResponse(GET /api/evidence/{chunkId})와 맞춥니다.

export interface EvidenceChunk {
  chunkId: string
  documentId: string
  documentTitle: string
  extension: string
  versionId: string
  versionNumber: number
  /** 근거 청크 전체 텍스트 */
  content: string
  /** content 안의 하이라이트 시작 위치(UTF-16). PDF는 null일 수 있습니다. */
  charStart: number | null
  /** content 안의 하이라이트 끝 위치(UTF-16). PDF는 null일 수 있습니다. */
  charEnd: number | null
  page: number | null
  /** 앞 청크 텍스트. 문서 시작이면 null */
  previousChunk: string | null
  /** 뒤 청크 텍스트. 문서 끝이면 null */
  nextChunk: string | null
  /**
   * 이 근거 버전의 원문 다운로드 경로(`/api/documents/{id}/versions/{versionId}/download`).
   * 인증 헤더가 필요해 브라우저로 직접 열 수 없고, 원문 표시는 문서 다운로드 API로 따로 받으므로 쓰지 않습니다.
   */
  downloadUrl: string
}
