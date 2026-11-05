import { useQuery, useQueryClient } from '@tanstack/react-query'
import { request, type PageResponse } from '@/shared/api'
import type {
  Document,
  DocumentDetail,
  DocumentListParams,
  DownloadUrl,
  IngestionJob,
} from '../model/types'

/** 서버가 허용하는 목록 크기의 최댓값 */
const MAX_PAGE_SIZE = 100

/** presigned URL(15분 유효)이 만료되기 전에 새로 받기 위한 신선도 유지 시간(10분) */
const DOWNLOAD_URL_STALE_TIME = 10 * 60 * 1000

/** 처리 중 문서의 상태를 다시 확인하는 주기(5초) */
const STATUS_POLL_INTERVAL = 5_000

export const documentKeys = {
  all: ['document'] as const,
  everyAccessible: ['document', 'list', 'all'] as const,
  detail: (id: string) => ['document', 'detail', id] as const,
  downloadUrl: (id: string) => ['document', 'downloadUrl', id] as const,
  status: (id: string) => ['document', 'status', id] as const,
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

/** 문서 상세 정보와 버전 이력, 처리 작업 상태를 가져옵니다. */
export function getDocument(id: string) {
  return request<DocumentDetail>({
    method: 'GET',
    url: `/api/documents/${encodeURIComponent(id)}`,
  })
}

/** 원문 파일의 15분 유효 presigned URL을 발급받습니다. */
export function getDownloadUrl(id: string) {
  return request<DownloadUrl>({
    method: 'GET',
    url: `/api/documents/${encodeURIComponent(id)}/download-url`,
  })
}

/** 문서의 파싱·임베딩 처리 상태를 확인합니다. */
export function getDocumentStatus(id: string) {
  return request<IngestionJob | null>({
    method: 'GET',
    url: `/api/documents/${encodeURIComponent(id)}/status`,
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => getDocument(id),
  })
}

export function useDownloadUrl(id: string, enabled = true) {
  return useQuery({
    queryKey: documentKeys.downloadUrl(id),
    queryFn: () => getDownloadUrl(id),
    enabled,
    staleTime: DOWNLOAD_URL_STALE_TIME,
    refetchOnWindowFocus: true,
  })
}

export function useDocumentStatus(id: string, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: documentKeys.status(id),
    queryFn: async () => {
      const job = await getDocumentStatus(id)
      if (job?.status === 'DONE' || job?.status === 'FAILED') {
        await queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) })
      }
      return job
    },
    enabled,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'DONE' || status === 'FAILED') return false
      return STATUS_POLL_INTERVAL
    },
  })
}
