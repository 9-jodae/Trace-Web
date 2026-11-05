import { useQuery } from '@tanstack/react-query'
import { request } from '@/shared/api'
import type { EvidenceChunk } from '../model/types'

/** 근거 조회 결과를 10분 동안 캐시합니다. */
const EVIDENCE_STALE_TIME_MS = 10 * 60 * 1000

export const evidenceKeys = {
  all: ['evidence'] as const,
  chunk: (chunkId?: string) => ['evidence', chunkId] as const,
}

export function getEvidence(chunkId: string) {
  return request<EvidenceChunk>({
    method: 'GET',
    url: `/api/evidence/${encodeURIComponent(chunkId)}`,
  })
}

export function useEvidence(chunkId?: string) {
  return useQuery({
    queryKey: evidenceKeys.chunk(chunkId),
    queryFn: () => getEvidence(chunkId!),
    enabled: Boolean(chunkId),
    staleTime: EVIDENCE_STALE_TIME_MS,
  })
}
