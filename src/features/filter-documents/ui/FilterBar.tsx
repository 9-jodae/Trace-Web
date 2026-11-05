import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { DOCUMENT_TYPE_LABEL, useAllDocuments } from '@/entities/document'
import { useDepartments } from '@/entities/department'
import { availableExtensions, filterDocuments } from '../lib/applyFilter'
import { useDocumentFilterStore } from '../model/filterStore'

const DOCUMENT_TYPE_OPTIONS = [...Object.keys(DOCUMENT_TYPE_LABEL), 'UNCLASSIFIED']

/** 그래프 탭 상단 필터 바. 문서 목록은 이미 그래프가 받아온 것을 react-query 캐시로 공유합니다. */
export function FilterBar() {
  const { data: documents = [] } = useAllDocuments()
  const { data: departments = [] } = useDepartments()
  const {
    filter,
    toggleDocumentType,
    toggleExtension,
    toggleOwnerDepartmentId,
    setAuthoredFrom,
    setAuthoredTo,
    setAuthorQuery,
  } = useDocumentFilterStore()
  const visibleCount = filterDocuments(documents, filter).length

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-1.5 border-b border-border-dark px-3.5 py-1.5">
      <button
        type="button"
        disabled
        title="문서함(소스)별 필터는 관리자 전용 API만 있어 아직 지원하지 않습니다"
        className="flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-ink-muted/60"
      >
        소스
        <ChevronDown className="size-2.5" aria-hidden />
      </button>

      <FilterDropdown label="문서 유형" active={filter.documentTypes.length > 0}>
        {DOCUMENT_TYPE_OPTIONS.map((type) => (
          <CheckboxRow
            key={type}
            checked={filter.documentTypes.includes(type)}
            onChange={() => toggleDocumentType(type)}
          >
            {type === 'UNCLASSIFIED' ? '분류 전' : DOCUMENT_TYPE_LABEL[type]}
          </CheckboxRow>
        ))}
      </FilterDropdown>

      <FilterDropdown label="확장자" active={filter.extensions.length > 0}>
        {availableExtensions(documents).map((extension) => (
          <CheckboxRow
            key={extension}
            checked={filter.extensions.includes(extension)}
            onChange={() => toggleExtension(extension)}
          >
            .{extension}
          </CheckboxRow>
        ))}
      </FilterDropdown>

      <FilterDropdown label="작성 기간" active={Boolean(filter.authoredFrom || filter.authoredTo)}>
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
      </FilterDropdown>

      <FilterDropdown
        label="부서 · 작성자"
        active={filter.ownerDepartmentIds.length > 0 || filter.authorQuery.length > 0}
      >
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
      </FilterDropdown>

      <div className="h-px flex-1" />
      <p className="pr-1.5 text-[13px] text-ink-muted">문서 {visibleCount}</p>
    </div>
  )
}

function FilterDropdown({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: ReactNode
}) {
  return (
    <details className="group relative">
      <summary
        className={`flex h-10 list-none items-center gap-1.5 rounded-lg px-2.5 text-[13px] [&::-webkit-details-marker]:hidden ${
          active ? 'bg-white/10 text-ink' : 'text-ink-dim hover:bg-white/5'
        }`}
      >
        {label}
        <ChevronDown className="size-2.5" aria-hidden />
      </summary>
      <div className="absolute top-full left-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-xl border border-border-dark-strong bg-surface-raised p-2 shadow-lg">
        {children}
      </div>
    </details>
  )
}

function CheckboxRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-white/5">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-ink" />
      {children}
    </label>
  )
}
