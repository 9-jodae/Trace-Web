import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { adminErrorMessage } from '@/entities/document'
import { sourceKindLabel, useSources } from '@/entities/source'
import { buttonSecondary } from '@/shared/ui'
import { AdminDocumentTable, type AdminListQuery } from '@/widgets/admin-document-table'
import { Sidebar } from '@/widgets/sidebar'
import { parseListQuery, toListSearch } from '../lib/listQuery'

/** 문서 관리 목록(/admin/documents). 소스·필터·페이지는 URL 쿼리에 둡니다. */
export function AdminDocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = parseListQuery(searchParams)
  const location = useLocation()
  const navigate = useNavigate()
  const notice = (location.state as { notice?: string } | null)?.notice

  const sources = useSources()

  const updateQuery = (patch: Partial<AdminListQuery>) => {
    setSearchParams(toListSearch({ ...query, ...patch }))
  }

  return (
    <div className="flex h-full bg-canvas text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden px-8 py-6">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-xl font-semibold">문서 관리</h1>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            소스
            <select
              value={query.sourceId ?? ''}
              disabled={!sources.data}
              onChange={(event) => updateQuery({ sourceId: event.target.value || null, page: 0 })}
              className="h-9 min-w-44 rounded-lg border border-border-dark-strong bg-surface-raised px-2.5 text-sm text-ink focus:outline-none"
            >
              <option value="">전체 소스</option>
              {sources.data?.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} · {sourceKindLabel(source.kind)}
                </option>
              ))}
            </select>
          </label>
        </header>

        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200"
          >
            {notice}
            <button
              type="button"
              onClick={() => navigate({ search: location.search }, { replace: true, state: null })}
              className="text-xs text-emerald-200/80 hover:text-emerald-100"
            >
              닫기
            </button>
          </div>
        )}

        {sources.error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-sm text-ink-dim">
            <p role="alert">{adminErrorMessage(sources.error)}</p>
            <button
              type="button"
              onClick={() => void sources.refetch()}
              className={buttonSecondary}
            >
              다시 시도
            </button>
          </div>
        ) : sources.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-sm text-ink-dim">
            <p>소스를 먼저 추가하세요</p>
          </div>
        ) : (
          <AdminDocumentTable
            query={query}
            onQueryChange={updateQuery}
            detailLinkState={{ from: location.search }}
          />
        )}
      </main>
    </div>
  )
}
