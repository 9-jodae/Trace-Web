import { http } from '@/shared/api'
import type { DocumentGraph } from '../model/types'

export const graphApi = {
  around: (documentIds: string[]) =>
    http<DocumentGraph>('/graph', { method: 'POST', body: JSON.stringify({ documentIds }) }),
}
