import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query'
import { request, requestBlob, type PageResponse } from '@/shared/api'
import { UPLOAD_TIMEOUT_MS } from '@/shared/config'
import type {
  AdminDocumentListParams,
  Document,
  DocumentDetail,
  ReviseInput,
  UpdateAccessInput,
  UploadFile,
  UploadOptions,
  UploadResult,
} from '../model/types'
import { documentKeys, FILE_DOWNLOAD_TIMEOUT_MS } from './documentApi'

/** 처리 대기·진행 중인 문서 상세를 다시 불러오는 주기(5초) */
const ADMIN_DETAIL_POLL_INTERVAL = 5_000

export const adminDocumentKeys = {
  all: ['document', 'admin'] as const,
  list: (params: AdminDocumentListParams) => ['document', 'admin', 'list', params] as const,
  detail: (id: string) => ['document', 'admin', 'detail', id] as const,
}

const adminUrl = (id: string) => `/api/admin/documents/${encodeURIComponent(id)}`

/** 관리자 문서 목록. 권한과 관계없이 모든 문서를 주며, 삭제된 문서는 서버가 뺍니다. */
export function adminListDocuments(params: AdminDocumentListParams) {
  return request<PageResponse<Document>>({ method: 'GET', url: '/api/admin/documents', params })
}

export function adminGetDocument(id: string) {
  return request<DocumentDetail>({ method: 'GET', url: adminUrl(id) })
}

/** 원문 파일(현재 버전). 인증 헤더가 필요해 브라우저가 주소를 직접 열지 않고 http 클라이언트로 받습니다. */
export function adminDownloadDocument(id: string) {
  return requestBlob({
    method: 'GET',
    url: `${adminUrl(id)}/download`,
    timeout: FILE_DOWNLOAD_TIMEOUT_MS,
  })
}

/** multipart 업로드 본문. files와 paths는 같은 순서로 반복합니다. */
export function buildUploadForm(files: UploadFile[], options: UploadOptions): FormData {
  const form = new FormData()
  for (const { file, path } of files) {
    form.append('files', file, file.name)
    form.append('paths', path)
  }
  form.append('clearance', options.clearance)
  for (const id of options.departmentIds) form.append('departmentIds', id)
  if (options.minimumPosition) form.append('minimumPosition', options.minimumPosition)
  if (options.ownerDepartmentId) form.append('ownerDepartmentId', options.ownerDepartmentId)
  const author = options.author?.trim()
  if (author) form.append('author', author)
  if (options.authoredAt) form.append('authoredAt', options.authoredAt)
  return form
}

/** 파일 여러 개를 한 요청으로 올립니다. 결과는 파일 순서대로 옵니다. */
export function adminUploadDocuments(
  sourceId: string,
  files: UploadFile[],
  options: UploadOptions,
) {
  return request<UploadResult[]>({
    method: 'POST',
    url: `/api/admin/sources/${encodeURIComponent(sourceId)}/documents`,
    data: buildUploadForm(files, options),
    timeout: UPLOAD_TIMEOUT_MS,
  })
}

/** 열람 권한을 통째로 바꿉니다. departmentIds와 minimumPosition은 보낸 값으로 대체됩니다. */
export function adminUpdateAccess(id: string, input: UpdateAccessInput) {
  return request<DocumentDetail>({ method: 'PATCH', url: `${adminUrl(id)}/access`, data: input })
}

/** 파일 하나로 새 버전을 만듭니다. 권한은 그대로 유지됩니다. */
export function adminReviseDocument(id: string, input: ReviseInput) {
  const form = new FormData()
  form.append('file', input.file, input.file.name)
  const author = input.author?.trim()
  if (author) form.append('author', author)
  if (input.authoredAt) form.append('authoredAt', input.authoredAt)
  return request<UploadResult>({
    method: 'POST',
    url: `${adminUrl(id)}/revisions`,
    data: form,
    timeout: UPLOAD_TIMEOUT_MS,
  })
}

/** 소프트 삭제. 같은 경로로 다시 올리면 복구됩니다. */
export function adminDeleteDocument(id: string) {
  return request<{ deleted: boolean }>({ method: 'DELETE', url: adminUrl(id) })
}

export function useAdminDocuments(params: AdminDocumentListParams) {
  return useQuery({
    queryKey: adminDocumentKeys.list(params),
    queryFn: () => adminListDocuments(params),
    placeholderData: keepPreviousData,
  })
}

/** 문서 상세. 처리 대기·진행 중이면 5초마다 다시 불러오고, 다른 상태가 되면 멈춥니다. */
export function useAdminDocument(id: string) {
  return useQuery({
    queryKey: adminDocumentKeys.detail(id),
    queryFn: () => adminGetDocument(id),
    refetchInterval: (query) => {
      const status = query.state.data?.job?.status
      return status === 'PENDING' || status === 'PROCESSING' ? ADMIN_DETAIL_POLL_INTERVAL : false
    },
  })
}

/**
 * 업로드·개정·삭제·권한 수정 뒤에 문서 쿼리를 모두 새로 받습니다. 관리 목록·상세뿐 아니라 직원용
 * 전체 문서 목록(그래프)과 문서 탭의 상세·처리 상태도 포함해, 열려 있던 문서 탭이 옛 버전을 보이지 않게 합니다.
 * 원문 파일은 버전 번호가 키에 있어 같은 버전의 내용이 바뀌지 않으므로 빼고(최대 20MB를 다시 받지 않도록),
 * 상세가 새 버전을 받으면 새 키로 따로 받습니다.
 */
export function invalidateAfterDocumentChange(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: documentKeys.all,
    // documentKeys.file(id, version) = ['document', 'file', id, version]
    predicate: (query) => query.queryKey[1] !== 'file',
  })
}

/** CREATED·UPDATED 중 기존 문서의 다음 버전인지. 서버는 새 버전도 CREATED로 줄 수 있습니다. */
export function isNewVersion(result: UploadResult): boolean {
  if (result.outcome === 'UPDATED') return true
  return result.outcome === 'CREATED' && (result.version ?? 1) > 1
}
