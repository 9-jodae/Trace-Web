import { useDocumentFilterStore } from '../model/filterStore'
import { FilterDropdown } from './FilterControls'
import { SourceKindField } from './FilterFields'

/** 홈 화면의 "전체 문서함" 버튼. 질문 검색 필터(`filters.sourceKinds`)에만 쓰입니다. */
export function SourceKindDropdown() {
  const { filter } = useDocumentFilterStore()
  return (
    <FilterDropdown
      label="전체 문서함"
      active={filter.sourceKinds.length > 0}
      count={filter.sourceKinds.length}
    >
      <SourceKindField />
    </FilterDropdown>
  )
}
