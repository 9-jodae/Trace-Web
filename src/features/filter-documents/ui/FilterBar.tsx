import { ChevronDown } from 'lucide-react'
import { useAllDocuments } from '@/entities/document'
import { filterDocuments } from '../lib/applyFilter'
import { useDocumentFilterStore } from '../model/filterStore'
import { FilterDropdown } from './FilterControls'
import {
  DepartmentAuthorField,
  DocumentTypeField,
  ExtensionField,
  PeriodField,
} from './FilterFields'

/** 그래프 탭 상단 필터 바. 문서 목록은 이미 그래프가 받아온 것을 react-query 캐시로 공유합니다. */
export function FilterBar() {
  const { data: documents = [] } = useAllDocuments()
  const { filter } = useDocumentFilterStore()
  const visibleCount = filterDocuments(documents, filter).length

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-1.5 border-b border-border-dark px-3.5 py-1.5">
      <button
        type="button"
        disabled
        title="문서 목록에 소스 종류가 없어 그래프 표시를 소스별로 거를 수 없습니다(질문 검색 필터에만 있음)"
        className="flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-ink-muted/60"
      >
        소스
        <ChevronDown className="size-2.5" aria-hidden />
      </button>

      <FilterDropdown label="문서 유형" active={filter.documentTypes.length > 0}>
        <DocumentTypeField />
      </FilterDropdown>

      <FilterDropdown label="확장자" active={filter.extensions.length > 0}>
        <ExtensionField />
      </FilterDropdown>

      <FilterDropdown label="작성 기간" active={Boolean(filter.authoredFrom || filter.authoredTo)}>
        <PeriodField />
      </FilterDropdown>

      <FilterDropdown
        label="부서 · 작성자"
        active={filter.ownerDepartmentIds.length > 0 || filter.authorQuery.length > 0}
      >
        <DepartmentAuthorField />
      </FilterDropdown>

      <div className="h-px flex-1" />
      <p className="pr-1.5 text-[13px] text-ink-muted">문서 {visibleCount}</p>
    </div>
  )
}
