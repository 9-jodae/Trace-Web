import type { DocumentType, FileExtension, SecurityLevel } from '@/shared/config'
import type { SourceKind } from '@/entities/source/@x/document'

export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface DocumentPermission {
  departments: string[]
  ranks: string[]
  securityLevel: SecurityLevel
  canView: boolean
  canEdit: boolean
  canDownload: boolean
}

export interface DocumentVersion {
  version: number
  createdAt: string
  isCurrent: boolean
}

export interface Document {
  id: string
  title: string
  source: SourceKind
  extension: FileExtension
  type: DocumentType
  author: string
  createdAt: string
  currentVersion: number
  status: ProcessingStatus
  permission: DocumentPermission
}
