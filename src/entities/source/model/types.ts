import type { SourceKind } from '@/entities/document/@x/source'
import type { Clearance } from '@/entities/user/@x/source'

// Trace-Server의 SourceRecord(GET /api/admin/sources)와 맞춥니다.

export interface Source {
  id: string
  kind: SourceKind
  name: string
  defaultDepartmentId: string | null
  defaultClearance: Clearance
  createdBy: string
}

/** POST /api/admin/sources. NOTION은 서버가 생성을 거부합니다. */
export interface CreateSourceInput {
  kind: 'LOCAL' | 'OBSIDIAN'
  /** 공백만으로는 만들 수 없습니다(서버 검증) */
  name: string
  defaultDepartmentId: string | null
  defaultClearance: Clearance
}
