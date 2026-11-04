import { http } from '@/shared/api'
import type { Document, DocumentVersion } from '../model/types'

export const documentApi = {
  list: () => http<Document[]>('/documents'),
  get: (id: string) => http<Document>(`/documents/${id}`),
  versions: (id: string) => http<DocumentVersion[]>(`/documents/${id}/versions`),
}
