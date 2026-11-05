import type { AskQuestionFilters } from '@/entities/answer'
import type { DocumentFilterState } from '../model/filterStore'

/**
 * 그래프 화면의 필터 상태를 질문 API(`filters`)용으로 바꿉니다.
 * 'UNCLASSIFIED'(분류 전)는 서버 enum에 없어 제외하고, 빈 배열은 서버가 400으로 거부하므로
 * undefined로 생략합니다. 아무 필터도 없으면 undefined를 돌려줘 `filters` 자체를 안 보냅니다.
 */
export function toQuestionFilters(filter: DocumentFilterState): AskQuestionFilters | undefined {
  const documentTypes = filter.documentTypes.filter((type) => type !== 'UNCLASSIFIED')
  const result: AskQuestionFilters = {
    extensions: filter.extensions.length > 0 ? filter.extensions : undefined,
    documentTypes: documentTypes.length > 0 ? documentTypes : undefined,
    sourceKinds: filter.sourceKinds.length > 0 ? filter.sourceKinds : undefined,
    authoredFrom: filter.authoredFrom ?? undefined,
    authoredTo: filter.authoredTo ?? undefined,
  }
  const hasAny = Object.values(result).some((value) => value !== undefined)
  return hasAny ? result : undefined
}
