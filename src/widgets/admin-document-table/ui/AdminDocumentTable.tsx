import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import {
  adminErrorMessage,
  clearanceLabel,
  DOCUMENT_TYPE_LABEL,
  documentTypeColor,
  documentTypeLabel,
  isProcessingStatus,
  positionLabel,
  PROCESSING_STATUS_LABEL,
  PROCESSING_STATUS_OPTIONS,
  useAdminDocuments,
  type Document,
} from '@/entities/document'
import { buttonSecondary } from '@/shared/ui'
import { ADMIN_PAGE_SIZE, type AdminListQuery } from '../model/types'

const DOCUMENT_TYPE_OPTIONS = Object.keys(DOCUMENT_TYPE_LABEL)
const SKELETON_ROWS = 6

const selectClass =
  'h-9 rounded-lg border border-border-dark-strong bg-surface-raised px-2.5 text-sm text-ink focus:outline-none'

/**
 * 관리자 문서 목록(필터 + 표 + 페이지 이동). 목록 응답에 처리 상태가 없어 상태 열은 두지 않고,
 * 상태는 필터와 상세에서 확인합니다.
 */
export function AdminDocumentTable({
  query,
  onQueryChange,
  detailLinkState,
}: {
  query: AdminListQuery
  /** 필터를 바꾸면 페이지를 0으로 되돌려 넘깁니다 */
  onQueryChange: (patch: Partial<AdminListQuery>) => void
  /** 상세로 이동할 때 넘길 라우터 state(뒤로 가기 시 필터 유지용) */
  detailLinkState?: unknown
}) {
  const { data, isPending, isFetching, error, refetch } = useAdminDocuments({
    sourceId: query.sourceId ?? undefined,
    status: query.status ?? undefined,
    documentType: query.documentType ?? undefined,
    page: query.page,
    size: ADMIN_PAGE_SIZE,
  })

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          처리 상태
          <select
            value={query.status ?? ''}
            onChange={(event) => {
              const value = event.target.value
              onQueryChange({ status: isProcessingStatus(value) ? value : null, page: 0 })
            }}
            className={selectClass}
          >
            <option value="">전체</option>
            {PROCESSING_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {PROCESSING_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          유형
          <select
            value={query.documentType ?? ''}
            onChange={(event) =>
              onQueryChange({ documentType: event.target.value || null, page: 0 })
            }
            className={selectClass}
          >
            <option value="">전체</option>
            {DOCUMENT_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
        {isFetching && !isPending && (
          <span className="text-xs text-ink-muted" aria-live="polite">
            새로 불러오는 중…
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border-dark">
        {error && !data ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-ink-dim">
            <p role="alert">{adminErrorMessage(error)}</p>
            <button type="button" onClick={() => void refetch()} className={buttonSecondary}>
              다시 시도
            </button>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="sticky top-0 bg-panel text-left text-xs text-ink-muted">
              <tr>
                <th className="w-[24%] px-4 py-2.5 font-medium">제목</th>
                <th className="w-[26%] px-4 py-2.5 font-medium">경로</th>
                <th className="w-[12%] px-4 py-2.5 font-medium">유형</th>
                <th className="w-[10%] px-4 py-2.5 font-medium">보안 등급</th>
                <th className="w-[10%] px-4 py-2.5 font-medium">최소 직급</th>
                <th className="w-[7%] px-4 py-2.5 font-medium">버전</th>
                <th className="w-[11%] px-4 py-2.5 font-medium">작성일</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <tr key={index} aria-hidden className="border-t border-border-dark">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-white/5" />
                    </td>
                  </tr>
                ))
              ) : data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-ink-muted">
                    조건에 맞는 문서가 없습니다
                  </td>
                </tr>
              ) : (
                data?.items.map((document) => (
                  <DocumentRow key={document.id} document={document} linkState={detailLinkState} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 0 && (
        <nav aria-label="페이지 이동" className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={query.page <= 0}
            onClick={() => onQueryChange({ page: query.page - 1 })}
            className={buttonSecondary}
          >
            <ChevronLeft className="size-4" aria-hidden />
            이전
          </button>
          <span className="tabular-nums text-ink-dim">
            {query.page + 1} / {data.totalPages}
          </span>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={query.page + 1 >= data.totalPages}
            onClick={() => onQueryChange({ page: query.page + 1 })}
            className={buttonSecondary}
          >
            다음
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </nav>
      )}
    </section>
  )
}

function DocumentRow({ document, linkState }: { document: Document; linkState?: unknown }) {
  return (
    <tr className="border-t border-border-dark hover:bg-white/[0.03]">
      <td className="truncate px-4 py-2.5">
        <Link
          to={`/admin/documents/${encodeURIComponent(document.id)}`}
          state={linkState}
          className="font-medium text-ink hover:underline"
        >
          {document.title}
        </Link>
      </td>
      <td className="truncate px-4 py-2.5 text-ink-dim" title={document.relativePath}>
        {document.relativePath}
      </td>
      <td className="px-4 py-2.5 text-ink-dim">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: documentTypeColor(document.documentType) }}
          />
          {documentTypeLabel(document.documentType)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-ink-dim">{clearanceLabel(document.clearance)}</td>
      <td className="px-4 py-2.5 text-ink-dim">{positionLabel(document.minimumPosition)}</td>
      <td className="px-4 py-2.5 text-ink-dim tabular-nums">v{document.currentVersion}</td>
      <td className="px-4 py-2.5 text-ink-dim tabular-nums">{document.authoredAt ?? '—'}</td>
    </tr>
  )
}
