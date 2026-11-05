import { useQuery } from '@tanstack/react-query'
import { request } from '@/shared/api'
import type { GraphParams, GraphResponse } from '../model/types'

export const graphKeys = {
  all: ['graph'] as const,
  full: ['graph', 'full'] as const,
  scoped: (params: GraphParams) => ['graph', 'scoped', params.documentId, params.depth] as const,
}

/**
 * 접근 가능한 문서 전체의 관계 그래프(Issue #22). documentId 없이 부르면 전체 그래프이고,
 * 관계가 없는 접근 가능 문서도 고립 노드로 항상 포함됩니다.
 */
export function getGraph(params: GraphParams = {}) {
  return request<GraphResponse>({ method: 'GET', url: '/api/graph', params })
}

export function useGraph(params: GraphParams = {}) {
  return useQuery({
    queryKey: params.documentId ? graphKeys.scoped(params) : graphKeys.full,
    queryFn: () => getGraph(params),
  })
}
