import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useDepartments } from '@/entities/department'
import {
  adminDownloadUrl,
  adminErrorMessage,
  documentTypeColor,
  documentTypeLabel,
  isNotFoundError,
  useAdminDocument,
  type DocumentDetail,
} from '@/entities/document'
import { useSources } from '@/entities/source'
import { buttonSecondary } from '@/shared/ui'
import { Sidebar } from '@/widgets/sidebar'
import { AccessSummary } from './AccessSummary'
import { Card } from './Card'
import { DocumentInfoCard } from './DocumentInfoCard'
import { ProcessingStatusCard } from './ProcessingStatusCard'
import { VersionHistoryCard } from './VersionHistoryCard'

const LIST_PATH = '/admin/documents'

/** 문서 관리 상세(/admin/documents/:id). 관리자 API만 씁니다. */
export function AdminDocumentDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? ''
  const listPath = `${LIST_PATH}${from}`

  const { data, isPending, error, refetch } = useAdminDocument(id)

  return (
    <div className="flex h-full bg-canvas text-ink">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        {isPending ? (
          <p className="py-16 text-center text-sm text-ink-muted">문서를 불러오는 중…</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-sm text-ink-dim">
            <p role="alert">
              {isNotFoundError(error)
                ? '문서를 찾을 수 없습니다(삭제되었을 수 있습니다)'
                : adminErrorMessage(error)}
            </p>
            <div className="flex gap-2">
              {!isNotFoundError(error) && (
                <button type="button" onClick={() => void refetch()} className={buttonSecondary}>
                  다시 시도
                </button>
              )}
              <Link to={listPath} className={buttonSecondary}>
                목록으로 가기
              </Link>
            </div>
          </div>
        ) : (
          <DetailContent detail={data} listPath={listPath} />
        )}
      </main>
    </div>
  )
}

function DetailContent({ detail, listPath }: { detail: DocumentDetail; listPath: string }) {
  const navigate = useNavigate()
  const { data: sources = [] } = useSources()
  const { data: departments = [] } = useDepartments()
  const { document } = detail

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="목록으로"
          onClick={() => navigate(listPath)}
          className="rounded-md p-1.5 text-ink-muted hover:bg-white/5 hover:text-ink"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="min-w-0 truncate text-xl font-semibold">{document.title}</h1>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-raised px-2 py-0.5 text-xs text-ink-dim">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: documentTypeColor(document.documentType) }}
          />
          {documentTypeLabel(document.documentType)}
        </span>
        <span className="rounded-md bg-surface-raised px-2 py-0.5 text-xs text-ink-dim tabular-nums">
          v{document.currentVersion}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <OpenOriginalButton documentId={document.id} />
        </div>
      </header>

      <ProcessingStatusCard detail={detail} />
      <DocumentInfoCard detail={detail} sources={sources} departments={departments} />
      <Card title="열람 권한">
        <AccessSummary detail={detail} departments={departments} />
      </Card>
      <VersionHistoryCard versions={detail.versions} />
    </div>
  )
}

/** 누를 때마다 새 URL을 발급받아 새 창으로 엽니다. URL은 화면이나 로그에 남기지 않습니다. */
function OpenOriginalButton({ documentId }: { documentId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  const open = async () => {
    setError(null)
    setOpening(true)
    try {
      const { url } = await adminDownloadUrl(documentId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (failure) {
      setError(adminErrorMessage(failure))
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-red-300">
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={opening}
        onClick={() => void open()}
        className={buttonSecondary}
      >
        <ExternalLink className="size-4" aria-hidden />
        원문 열기
      </button>
    </div>
  )
}
