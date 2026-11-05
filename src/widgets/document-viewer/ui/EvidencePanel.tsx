import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'
import { useTabStore } from '@/features/document-tabs'
import { EvidencePassage, useEvidence } from '@/entities/evidence'
import { ApiRequestError, toErrorMessage } from '@/shared/api'

/**
 * 문서 뷰어 상단에 고정되는 답변 근거 영역입니다.
 * EvidenceChunk.downloadUrl은 사용하지 않으며 화면이나 로그에 노출하지 않습니다.
 */
export function EvidencePanel({ documentId, chunkId }: { documentId: string; chunkId: string }) {
  const closeEvidence = useTabStore((state) => state.closeEvidence)
  const { data: evidence, isPending, error, refetch } = useEvidence(chunkId)
  const [collapsed, setCollapsed] = useState(false)

  const isNotFound =
    error instanceof ApiRequestError && (error.status === 404 || error.code === 'NOT_FOUND')

  return (
    <section
      aria-label="답변 근거"
      className="flex max-h-[40%] shrink-0 flex-col border-b border-amber-500/30 bg-amber-500/[0.06]"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-amber-400">답변 근거</span>
          {evidence && (
            <>
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-400">
                v{evidence.versionNumber}
              </span>
              {evidence.page !== null && <span className="text-ink-dim">{evidence.page}쪽</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-ink-dim hover:bg-white/5 hover:text-ink"
          >
            {collapsed ? (
              <>
                <ChevronDown className="size-3.5" aria-hidden />
                근거 펼치기
              </>
            ) : (
              <>
                <ChevronUp className="size-3.5" aria-hidden />
                근거 접기
              </>
            )}
          </button>
          <button
            type="button"
            aria-label="답변 근거 닫기"
            onClick={() => closeEvidence(documentId)}
            className="rounded p-1 text-ink-muted hover:bg-white/5 hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-amber-500/20 px-4 py-3">
          {isPending ? (
            <p className="text-sm text-ink-muted">근거를 불러오는 중…</p>
          ) : error ? (
            isNotFound ? (
              <p role="alert" className="text-sm text-ink-dim">
                이 근거는 문서가 개정·삭제되었거나 볼 권한이 없어 표시할 수 없습니다
              </p>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <p role="alert" className="text-red-300">
                  {toErrorMessage(error)}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-md border border-border-dark-strong bg-surface-raised px-2.5 py-1 text-xs text-ink-dim hover:text-ink"
                >
                  다시 시도
                </button>
              </div>
            )
          ) : (
            evidence && <EvidencePassage evidence={evidence} />
          )}
        </div>
      )}
    </section>
  )
}
