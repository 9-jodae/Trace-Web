import { isProcessingStatus } from '@/entities/document'
import type { AdminListQuery } from '@/widgets/admin-document-table'

/** URL 쿼리(?source=&status=&type=&page=)를 목록 상태로 읽습니다. 잘못된 값은 무시합니다. */
export function parseListQuery(params: URLSearchParams): AdminListQuery {
  const status = params.get('status')
  const page = Number(params.get('page'))
  return {
    sourceId: params.get('source') || null,
    status: isProcessingStatus(status) ? status : null,
    documentType: params.get('type') || null,
    page: Number.isInteger(page) && page > 0 ? page : 0,
  }
}

/** 목록 상태를 URL 쿼리로 씁니다. 기본값(전체, 0페이지)은 생략합니다. */
export function toListSearch(query: AdminListQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.sourceId) params.set('source', query.sourceId)
  if (query.status) params.set('status', query.status)
  if (query.documentType) params.set('type', query.documentType)
  if (query.page > 0) params.set('page', String(query.page))
  return params
}
