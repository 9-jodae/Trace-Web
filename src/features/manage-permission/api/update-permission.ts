import { http } from '@/shared/api'
import type { DocumentPermission } from '@/entities/document'

export const updatePermission = (documentId: string, permission: DocumentPermission) =>
  http<void>(`/documents/${documentId}/permission`, { method: 'PUT', body: JSON.stringify(permission) })
