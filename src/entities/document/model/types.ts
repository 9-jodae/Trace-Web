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

export interface DocumentVersion {
  id: string
  number: number
  fileSize: number
  contentHash: string
  uploadedBy: string | null
  createdAt: string
}

export interface IngestionJob {
  id: string
  versionId: string
  status: ProcessingStatus
  errorMessage: string | null
  startedAt: string | null
  finishedAt: string | null
}

// GET /api/documents/{id}
export interface DocumentDetail {
  document: Document
  departmentIds: string[]
  versions: DocumentVersion[]
  job: IngestionJob | null
}

// ─── 관리자 API(/api/admin) ───────────────────────────────────────────────

/** GET /api/admin/documents 쿼리 중 관리 화면에서 쓰는 것 */
export interface AdminDocumentListParams {
  sourceId?: string
  status?: ProcessingStatus
  documentType?: string
  page?: number
  size?: number
}

/**
 * 업로드·개정 결과. 서버 문서에는 UPDATED도 있지만 현재 서버는 새 버전도 CREATED로 돌려주므로
 * 새 문서/새 버전 구분은 version으로 합니다(`isNewVersion`). 모르는 값은 그대로 표시합니다.
 */
export type UploadOutcome = 'CREATED' | 'UPDATED' | 'UNCHANGED' | 'EXCLUDED'

export interface UploadResult {
  path: string
  /** EXCLUDED면 null */
  documentId: string | null
  version: number | null
  outcome: UploadOutcome | (string & {})
  reason: string | null
}

/** 업로드 요청 하나의 모든 파일에 똑같이 적용되는 권한과 정보 */
export interface UploadOptions {
  clearance: Clearance
  /** 비우면 보내지 않습니다(새 문서는 소스 기본 부서, 기존 문서는 기존 값) */
  departmentIds: string[]
  /** null이면 보내지 않습니다 */
  minimumPosition: Position | null
  /** null이면 보내지 않습니다(새 문서는 소스 기본 부서) */
  ownerDepartmentId: string | null
  author: string | null
  /** YYYY-MM-DD */
  authoredAt: string | null
}

export interface UploadFile {
  file: File
  /** 소스 안 상대 경로. 소스 안 문서 ID로 쓰입니다. */
  path: string
}

/** PATCH /api/admin/documents/{id}/access */
export interface UpdateAccessInput {
  clearance: Clearance
  /** 빈 배열 = 전체 부서 열람 */
  departmentIds: string[]
  minimumPosition: Position | null
  /** 생략하면 기존 값 유지 */
  ownerDepartmentId?: string
}

/** POST /api/admin/documents/{id}/revisions */
export interface ReviseInput {
  file: File
  author: string | null
  /** YYYY-MM-DD */
  authoredAt: string | null
}
