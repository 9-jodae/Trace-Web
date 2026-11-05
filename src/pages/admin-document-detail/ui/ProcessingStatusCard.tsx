import { Loader2 } from 'lucide-react'
import type { DocumentDetail } from '@/entities/document'
import { formatDateTime } from '../lib/format'
import { Card } from './Card'

/** 현재 버전의 처리(파싱·임베딩) 상태. 대기·처리 중이면 상세 쿼리가 5초마다 다시 불러옵니다. */
export function ProcessingStatusCard({ detail }: { detail: DocumentDetail }) {
  const { job, versions, document } = detail
  const currentVersionId = versions.find(
    (version) => version.number === document.currentVersion,
  )?.id
  const isStale =
    job !== null && currentVersionId !== undefined && job.versionId !== currentVersionId

  return (
    <Card title="처리 상태">
      {job === null ? (
        <p className="text-sm text-ink-dim">처리 요청 전</p>
      ) : job.status === 'PENDING' ? (
        <p className="flex items-center gap-2 text-sm text-amber-300">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          대기 중
        </p>
      ) : job.status === 'PROCESSING' ? (
        <p className="flex items-center gap-2 text-sm text-amber-300">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          처리 중 <span className="text-ink-muted">· 시작 {formatDateTime(job.startedAt)}</span>
        </p>
      ) : job.status === 'DONE' ? (
        <p className="text-sm text-emerald-300">
          완료 <span className="text-ink-muted">· {formatDateTime(job.finishedAt)}</span>
        </p>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-red-300">
            실패 <span className="text-ink-muted">· {formatDateTime(job.finishedAt)}</span>
          </p>
          {job.errorMessage && (
            <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs break-all text-red-200">
              {job.errorMessage}
            </p>
          )}
          <p className="text-xs text-ink-muted">
            다시 처리하는 기능은 아직 없습니다. 문서를 삭제한 뒤 같은 경로로 다시 올리면 새 버전으로
            처리됩니다.
          </p>
        </div>
      )}
      {isStale && <p className="mt-2 text-xs text-ink-muted">이전 버전의 처리 결과</p>}
    </Card>
  )
}
