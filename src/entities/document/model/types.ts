import type { Clearance, Position } from '@/entities/user/@x/document'

// docs199-Server의 DocumentRecord(GET /api/documents)와 맞춥니다.

export type SourceKind = 'LOCAL' | 'OBSIDIAN' | 'NOTION'

/** 문서 처리(파싱·임베딩) 상태 */
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface Document {
  id: string
  sourceId: string
  externalId: string
  title: string
  relativePath: string
  extension: string
  /**
   * 문서 유형. 기획은 분류 모델이 유형 체계를 자동으로 만드는 방식이라 값 목록을 고정하지 않고
   * 서버가 준 문자열을 그대로 씁니다. AI 처리가 끝나기 전에는 null입니다.
   */
  documentType: string | null
  author: string | null
  authoredAt: string | null
  clearance: Clearance
  minimumPosition: Position | null
  currentVersion: number
  deletedAt: string | null
  ownerDepartmentId: string | null
  sourceModifiedAt: string | null
}

export interface DocumentListParams {
  sourceId?: string
  sourceKind?: SourceKind
  extension?: string
  documentType?: string
  authoredFrom?: string
  authoredTo?: string
  status?: ProcessingStatus
  ownerDepartmentId?: string
  page?: number
  size?: number
}
