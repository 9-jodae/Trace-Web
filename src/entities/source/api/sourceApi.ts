import { useQuery } from '@tanstack/react-query'
import { request } from '@/shared/api'
import type { CreateSourceInput, Source } from '../model/types'

export const sourceKeys = {
  all: ['source'] as const,
  list: ['source', 'list'] as const,
}

/** 관리자 전용 소스 목록. 페이지가 아닌 배열로 옵니다. */
export function listSources() {
  return request<Source[]>({ method: 'GET', url: '/api/admin/sources' })
}

export function createSource(input: CreateSourceInput) {
  return request<Source>({ method: 'POST', url: '/api/admin/sources', data: input })
}

export function useSources() {
  return useQuery({ queryKey: sourceKeys.list, queryFn: listSources })
}
