import { DOCUMENT_TYPE_LABEL, useAllDocuments, type SourceKind } from '@/entities/document'
import { useDepartments } from '@/entities/department'
import { availableExtensions } from '../lib/applyFilter'
import { useDocumentFilterStore } from '../model/filterStore'
import { CheckboxRow } from './FilterControls'

const DOCUMENT_TYPE_OPTIONS = [...Object.keys(DOCUMENT_TYPE_LABEL), 'UNCLASSIFIED']

const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  LOCAL: '로컬 드라이브',
  OBSIDIAN: 'Obsidian',
  NOTION: 'Notion',
}
const SOURCE_KIND_OPTIONS = Object.keys(SOURCE_KIND_LABEL) as SourceKind[]

export function DocumentTypeField() {
  const { filter, toggleDocumentType } = useDocumentFilterStore()
  return (
    <>
      {DOCUMENT_TYPE_OPTIONS.map((type) => (
        <CheckboxRow
          key={type}
          checked={filter.documentTypes.includes(type)}
          onChange={() => toggleDocumentType(type)}
        >
          {type === 'UNCLASSIFIED' ? '분류 전' : DOCUMENT_TYPE_LABEL[type]}
        </CheckboxRow>
      ))}
    </>
  )
}

export function ExtensionField() {
  const { data: documents = [] } = useAllDocuments()
  const { filter, toggleExtension } = useDocumentFilterStore()
  return (
    <>
      {availableExtensions(documents).map((extension) => (
        <CheckboxRow
          key={extension}
          checked={filter.extensions.includes(extension)}
          onChange={() => toggleExtension(extension)}
        >
          .{extension}
        </CheckboxRow>
      ))}
    </>
  )
}

export function PeriodField() {
  const { filter, setAuthoredFrom, setAuthoredTo } = useDocumentFilterStore()
  return (
    <>
      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        시작일
        <input
          type="date"
          value={filter.authoredFrom ?? ''}
          onChange={(event) => setAuthoredFrom(event.target.value || null)}
          className="rounded-md border border-border-dark-strong bg-surface-raised px-2 py-1 text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        종료일
        <input
          type="date"
          value={filter.authoredTo ?? ''}
          onChange={(event) => setAuthoredTo(event.target.value || null)}
          className="rounded-md border border-border-dark-strong bg-surface-raised px-2 py-1 text-ink"
        />
      </label>
    </>
  )
}

export function DepartmentAuthorField() {
  const { data: departments = [] } = useDepartments()
  const { filter, toggleOwnerDepartmentId, setAuthorQuery } = useDocumentFilterStore()
  return (
    <>
      <input
        type="text"
        placeholder="작성자 이름"
        value={filter.authorQuery}
        onChange={(event) => setAuthorQuery(event.target.value)}
        className="w-full rounded-md border border-border-dark-strong bg-surface-raised px-2 py-1 text-sm text-ink placeholder:text-ink-muted"
      />
      <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
        {departments.map((department) => (
          <CheckboxRow
            key={department.id}
            checked={filter.ownerDepartmentIds.includes(department.id)}
            onChange={() => toggleOwnerDepartmentId(department.id)}
          >
            {department.name}
          </CheckboxRow>
        ))}
      </div>
    </>
  )
}

/** 질문 검색 필터(`filters.sourceKinds`) 전용. 그래프 표시 필터링에는 쓰이지 않습니다. */
export function SourceKindField() {
  const { filter, toggleSourceKind } = useDocumentFilterStore()
  return (
    <>
      {SOURCE_KIND_OPTIONS.map((kind) => (
        <CheckboxRow
          key={kind}
          checked={filter.sourceKinds.includes(kind)}
          onChange={() => toggleSourceKind(kind)}
        >
          {SOURCE_KIND_LABEL[kind]}
        </CheckboxRow>
      ))}
    </>
  )
}

export function SectionLabel({ children }: { children: string }) {
  return <p className="px-2 pt-2 pb-1 text-xs font-medium text-ink-muted first:pt-0">{children}</p>
}
