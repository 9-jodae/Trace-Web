import { http } from '@/shared/api'

export const deleteDocument = (id: string) => http<void>(`/documents/${id}`, { method: 'DELETE' })
