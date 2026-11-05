import { request } from '@/shared/api'
import type { EvidenceChunk } from '../model/types'

export const evidenceKeys = {
  chunk: (chunkId: string) => ['evidence', chunkId] as const,
}

export function getEvidence(chunkId: string) {
  return request<EvidenceChunk>({
    method: 'GET',
    url: `/api/evidence/${encodeURIComponent(chunkId)}`,
  })
}
