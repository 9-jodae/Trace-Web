import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { request, requestBlob, type PageResponse } from '@/shared/api'
import type { Document, DocumentDetail, DocumentListParams, IngestionJob } from '../model/types'

/** 서버가 허용하는 목록 크기의 최댓값 */
const MAX_PAGE_SIZE = 100

/** 처리 중 문서의 상태를 다시 확인하는 주기(5초) */
const STATUS_POLL_INTERVAL = 5_000

/** 원문 파일(최대 20MB) 다운로드의 시간 한도(2분). 기본 30초로는 느린 연결에서 끊길 수 있습니다. */
export const FILE_DOWNLOAD_TIMEOUT_MS = 120_000

export const documentKeys = {
  all: ['document'] as const,
  everyAccessible: ['document', 'list', 'all'] as const,
  detail: (id: string) => ['document', 'detail', id] as const,
  file: (id: string, version: number) => ['document', 'file', id, version] as const,
  status: (id: string) => ['document', 'status', id] as const,
}

/** 본인 권한 범위 안의 문서 목록. 권한 필터는 서버가 적용합니다. */
export function listDocuments(params: DocumentListParams = {}) {
  return request<PageResponse<Document>>({ method: 'GET', url: '/api/documents', params })
}

/**
 * 볼 수 있는 모든 문서를 모읍니다(그래프에 모든 노드를 표시하기 위해). 첫 페이지로 전체 페이지 수를
 * 알게 되면 나머지 페이지는 한꺼번에 요청합니다.
 */
export async function fetchAllDocuments(): Promise<Document[]> {
  const first = await listDocuments({ page: 0, size: MAX_PAGE_SIZE })
  if (first.items.length === 0 || first.totalPages <= 1) return first.items
  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      listDocuments({ page: index + 1, size: MAX_PAGE_SIZE }),
    ),
  )
  return [first, ...rest].flatMap((result) => result.items)
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

/**
 * 원문 파일(현재 버전)을 받습니다. 서버가 로그인과 열람 권한을 확인한 뒤 파일을 그대로 보내므로
 * 인증 헤더가 붙는 http 클라이언트로 받아야 합니다. 브라우저가 이 주소를 직접 열면 401입니다.
 */
export function downloadDocument(id: string) {
  return requestBlob({
    method: 'GET',
    url: `/api/documents/${encodeURIComponent(id)}/download`,
    timeout: FILE_DOWNLOAD_TIMEOUT_MS,
  })
}

/**
 * 원문 파일 조회. 버전 번호를 키에 넣어 개정되면 새로 받고, 같은 버전은 내용이 바뀌지 않으므로
 * 다시 받지 않습니다(창 포커스마다 큰 파일을 다시 받지 않도록).
 */
export function documentFileQuery(id: string, version: number) {
  return queryOptions({
    queryKey: documentKeys.file(id, version),
    queryFn: () => downloadDocument(id),
    staleTime: Infinity,
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

export function useDocumentFile(id: string, version: number, enabled: boolean) {
  return useQuery({ ...documentFileQuery(id, version), enabled })
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
