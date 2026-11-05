import { useQuery } from '@tanstack/react-query'
import { request, type PageResponse } from '@/shared/api'
import type { Document, DocumentListParams } from '../model/types'

/** 서버가 허용하는 목록 크기의 최댓값 */
const MAX_PAGE_SIZE = 100

export const documentKeys = {
  all: ['document'] as const,
  everyAccessible: ['document', 'list', 'all'] as const,
}

/** 본인 권한 범위 안의 문서 목록. 권한 필터는 서버가 적용합니다. */
export function listDocuments(params: DocumentListParams = {}) {
  return request<PageResponse<Document>>({ method: 'GET', url: '/api/documents', params })
}

/** 볼 수 있는 모든 문서를 페이지를 넘기며 모읍니다(그래프에 모든 노드를 표시하기 위해). */
export async function fetchAllDocuments(): Promise<Document[]> {
  const documents: Document[] = []
  for (let page = 0; ; page++) {
    const result = await listDocuments({ page, size: MAX_PAGE_SIZE })
    documents.push(...result.items)
    if (page + 1 >= result.totalPages || result.items.length === 0) return documents
  }
}

export function useAllDocuments() {
  return useQuery({ queryKey: documentKeys.everyAccessible, queryFn: fetchAllDocuments })
}
