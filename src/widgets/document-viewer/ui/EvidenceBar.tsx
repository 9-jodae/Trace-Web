import { Crosshair, X } from 'lucide-react'
import type { EvidenceChunk } from '@/entities/evidence'
import { ApiRequestError, toErrorMessage } from '@/shared/api'
import type { EvidenceHighlightStatus } from '../lib/useEvidenceHighlight'

/**
 * 원문 위에 근거를 덮어 보여주지 않고, 원문 안에 칠한 근거의 상태만 한 줄로 알려줍니다.
 * EvidenceChunk.downloadUrl은 사용하지 않으며 화면이나 로그에 노출하지 않습니다.
 */
export function EvidenceBar({
  evidence,
  isPending,
  error,
  currentVersion,
  status,
  contentReady,
  onRetry,
  onScrollToEvidence,
  onClose,
}: {
  evidence: EvidenceChunk | undefined
  isPending: boolean
  error: Error | null
  currentVersion: number | undefined
  status: EvidenceHighlightStatus
  /** 원문을 끝까지 그렸는지. 다 그리기 전에는 "찾지 못함"을 띄우지 않습니다. */
  contentReady: boolean
  onRetry: () => void
  onScrollToEvidence: () => void
  onClose: () => void
}) {
  const isNotFound =
    error instanceof ApiRequestError && (error.status === 404 || error.code === 'NOT_FOUND')
  const versionMismatch =
    evidence !== undefined &&
    currentVersion !== undefined &&
    evidence.versionNumber !== currentVersion

  return (
    <section
      aria-label="답변 근거"
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/[0.06] px-4 py-1.5 text-xs"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-semibold text-amber-400">답변 근거</span>
        {evidence && (
          <>
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-400">
              v{evidence.versionNumber}
            </span>
            {evidence.page !== null && <span className="text-ink-dim">{evidence.page}쪽</span>}
          </>
        )}
        {isPending ? (
          <span className="text-ink-muted">근거를 불러오는 중…</span>
        ) : error ? (
          isNotFound ? (
            <span role="alert" className="text-ink-dim">
              이 근거는 문서가 개정·삭제되었거나 볼 권한이 없어 표시할 수 없습니다
            </span>
          ) : (
            <>
              <span role="alert" className="text-red-300">
                {toErrorMessage(error)}
              </span>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md border border-border-dark-strong bg-surface-raised px-2 py-0.5 text-ink-dim hover:text-ink"
              >
                다시 시도
              </button>
            </>
          )
        ) : status === 'found' ? (
          <span className="text-ink-dim">원문에 표시했습니다</span>
        ) : status === 'located' ? (
          <span className="text-ink-dim">표시할 핵심 문구가 없어 근거 위치로 이동했습니다</span>
        ) : status === 'missing' && contentReady ? (
          <span role="status" className="text-ink-dim">
            {versionMismatch
              ? `근거는 v${evidence?.versionNumber} 기준이라 지금 원문(v${currentVersion})에서 위치를 찾지 못했습니다`
              : '원문에서 근거 위치를 찾지 못했습니다'}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {(status === 'found' || status === 'located') && (
          <button
            type="button"
            onClick={onScrollToEvidence}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-ink-dim hover:bg-white/5 hover:text-ink"
          >
            <Crosshair className="size-3.5" aria-hidden />
            근거로 이동
          </button>
        )}
        <button
          type="button"
          aria-label="답변 근거 닫기"
          onClick={onClose}
          className="rounded p-1 text-ink-muted hover:bg-white/5 hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </section>
  )
}
