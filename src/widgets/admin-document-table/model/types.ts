import type { ProcessingStatus } from '@/entities/document'

/** 목록 화면의 필터·페이지 상태. 페이지가 URL 쿼리와 맞춥니다. */
export interface AdminListQuery {
  sourceId: string | null
  status: ProcessingStatus | null
  documentType: string | null
  /** 제목·경로 검색어. 비어 있으면 서버 목록을 그대로 씁니다 */
  search: string
  /** 0부터 */
  page: number
}

export const ADMIN_PAGE_SIZE = 20
