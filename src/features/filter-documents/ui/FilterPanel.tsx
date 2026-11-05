import { useDocumentFilterStore } from '../model/filterStore'
import { FilterDropdown } from './FilterControls'
import {
  DepartmentAuthorField,
  DocumentTypeField,
  ExtensionField,
  PeriodField,
  SectionLabel,
} from './FilterFields'

/** 홈 화면 질문 입력창의 "필터" 버튼: 유형/확장자/기간/부서·작성자를 한 패널에 모아 보여줍니다. */
export function FilterPanel() {
  const { filter } = useDocumentFilterStore()
  const active =
    filter.documentTypes.length > 0 ||
    filter.extensions.length > 0 ||
    Boolean(filter.authoredFrom || filter.authoredTo) ||
    filter.ownerDepartmentIds.length > 0 ||
    filter.authorQuery.length > 0

  return (
    <FilterDropdown label="필터" active={active}>
      <div className="max-h-96 w-56 overflow-y-auto">
        <SectionLabel>문서 유형</SectionLabel>
        <DocumentTypeField />
        <SectionLabel>확장자</SectionLabel>
        <ExtensionField />
        <SectionLabel>작성 기간</SectionLabel>
        <div className="flex gap-2 px-2">
          <PeriodField />
        </div>
        <SectionLabel>부서 · 작성자</SectionLabel>
        <div className="px-2 pb-1">
          <DepartmentAuthorField />
        </div>
      </div>
    </FilterDropdown>
  )
}
