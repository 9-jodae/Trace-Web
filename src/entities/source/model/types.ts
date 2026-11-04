import type { SecurityLevel } from '@/shared/config'

export type SourceKind = 'notion' | 'obsidian' | 'local'

export interface Source {
  id: string
  kind: SourceKind
  name: string
  /** 포함/제외할 하위 폴더·페이지 경로 */
  includes: string[]
  excludes: string[]
  defaultDepartments: string[]
  defaultSecurityLevel: SecurityLevel
  lastSyncedAt: string | null
}
