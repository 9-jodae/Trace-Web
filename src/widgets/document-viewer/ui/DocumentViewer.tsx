import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useChatStore } from '@/features/ask-question'
import { useTabStore } from '@/features/document-tabs'
import {
  documentFileName,
  documentFileQuery,
  useDocument,
  useDocumentFile,
  useDocumentStatus,
  type ProcessingStatus,
} from '@/entities/document'
import { ApiRequestError, toErrorMessage } from '@/shared/api'
import { saveBlob } from '@/shared/lib'
import { EvidencePanel } from './EvidencePanel'
import { MarkdownContent } from './MarkdownContent'

const PdfContent = lazy(() => import('./PdfContent'))

function normalizeExtension(extension: string): string {
  return extension.toLowerCase().replace(/^\./, '')
}

function StatusBadge({ status }: { status: ProcessingStatus | null }) {
  if (status === 'PENDING' || status === 'PROCESSING') {
    return (
      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
        처리 중
      </span>
    )
  }
  if (status === 'FAILED') {
    return (
      <span className="rounded bg-red-950/40 px-2 py-0.5 text-xs font-medium text-red-300">
        처리 실패
      </span>
    )
  }
  return null
}

/**
 * 문서 탭에서 문서 메타데이터와 원문(PDF·Markdown)을 보여줍니다.
 * 원문 파일은 서버가 인증 헤더를 요구하므로 http 클라이언트로 받은 파일을 그대로 그리고,
 * 다운로드도 받은 파일을 저장합니다. 브라우저가 다운로드 주소를 직접 열지 않습니다.
 */
export function DocumentViewer({ documentId }: { documentId: string }) {
  const queryClient = useQueryClient()
  const closeDocument = useTabStore((state) => state.closeDocument)
  const focusChunkId = useTabStore(
    (state) => state.documentTabs.find((tab) => tab.documentId === documentId)?.focusChunkId,
  )

  const focusHighlights = useTabStore(
    (state) => state.documentTabs.find((tab) => tab.documentId === documentId)?.focusHighlights,
  )

  // 원문에는 가장 최근 답변이 이 문서에서 인용한 문구만 칠합니다. 새 질문을 하면 지워집니다.
  const latestEvidence = useChatStore((state) => state.latestEvidence)
  const quotes = useMemo(
    () => latestEvidence.filter((item) => item.documentId === documentId).map((item) => item.quote),
    [latestEvidence, documentId],
  )

  const { data, isPending, error, refetch } = useDocument(documentId)

  const initialJobStatus = data?.job?.status ?? null
  const shouldPollStatus = initialJobStatus === 'PENDING' || initialJobStatus === 'PROCESSING'
  const { data: polledJob } = useDocumentStatus(documentId, shouldPollStatus)

  const currentJob = polledJob !== undefined ? polledJob : (data?.job ?? null)
  const ext = data ? normalizeExtension(data.document.extension) : ''
  const isPreviewable = ext === 'pdf' || ext === 'md'

  const version = data?.document.currentVersion ?? 0
  const {
    data: file,
    error: fileError,
    isFetching: isFileFetching,
    dataUpdatedAt: fileUpdatedAt,
    refetch: refetchFile,
  } = useDocumentFile(documentId, version, Boolean(data) && isPreviewable)

  // 그리기에 실패한 파일의 수신 시각. 다시 받거나 새 버전을 받으면 값이 달라져 오류 표시가 저절로 풀립니다.
  const [failedFileAt, setFailedFileAt] = useState<number | null>(null)
  const contentError = file !== undefined && failedFileAt === fileUpdatedAt
  const [downloading, setDownloading] = useState(false)
  const [downloadActionError, setDownloadActionError] = useState<string | null>(null)

  const handleContentError = useCallback(() => setFailedFileAt(fileUpdatedAt), [fileUpdatedAt])

  const handleRetryContent = useCallback(() => void refetchFile(), [refetchFile])

  // 미리보기로 이미 받은 파일이 있으면 그대로 저장하고, 없으면(미리보기 미지원 형식) 이때 받습니다.
  const handleDownload = useCallback(async () => {
    if (!data) return
    setDownloadActionError(null)
    setDownloading(true)
    try {
      const blob = await queryClient.fetchQuery(
        documentFileQuery(documentId, data.document.currentVersion),
      )
      saveBlob(blob, documentFileName(data.document))
    } catch (err) {
      setDownloadActionError(toErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }, [data, documentId, queryClient])

  const document = data?.document
  const isNotFound =
    error instanceof ApiRequestError && (error.status === 404 || error.code === 'NOT_FOUND')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {document && (
        <header className="flex flex-col gap-2 border-b border-border-dark bg-panel px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-ink">{document.title}</h2>
                <span className="rounded bg-surface-raised px-1.5 py-0.5 text-xs font-medium text-ink-dim">
                  v{document.currentVersion}
                </span>
                <StatusBadge status={currentJob?.status ?? null} />
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-muted">{document.relativePath}</p>
            </div>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="shrink-0 rounded-md border border-border-dark-strong bg-surface-raised px-3 py-1 text-xs font-medium text-ink-dim hover:text-ink disabled:opacity-50"
            >
              다운로드
            </button>
          </div>
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-dim">
            <div className="flex items-center gap-1">
              <dt className="text-ink-muted">유형</dt>
              <dd>{document.documentType ?? '분류 전'}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="text-ink-muted">작성자</dt>
              <dd>{document.author ?? '-'}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="text-ink-muted">작성일</dt>
              <dd>{document.authoredAt ?? '-'}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="text-ink-muted">보안 등급</dt>
              <dd>{document.clearance}</dd>
            </div>
          </dl>
          {downloadActionError && (
            <p role="alert" className="text-xs text-red-300">
              {downloadActionError}
            </p>
          )}
        </header>
      )}

      {focusChunkId && (
        <EvidencePanel
          key={focusChunkId}
          documentId={documentId}
          chunkId={focusChunkId}
          highlights={focusHighlights}
        />
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {isPending ? (
          <CenteredMessage>문서를 불러오는 중…</CenteredMessage>
        ) : error ? (
          isNotFound ? (
            <CenteredMessage>
              <p role="alert">문서를 찾을 수 없거나 볼 권한이 없습니다</p>
              <button
                type="button"
                onClick={() => closeDocument(documentId)}
                className="rounded-md border border-border-dark-strong px-3 py-1 text-ink-dim hover:text-ink"
              >
                탭 닫기
              </button>
            </CenteredMessage>
          ) : (
            <CenteredMessage>
              <p role="alert">{toErrorMessage(error)}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-md border border-border-dark-strong px-3 py-1 text-ink-dim hover:text-ink"
              >
                다시 시도
              </button>
            </CenteredMessage>
          )
        ) : !isPreviewable ? (
          <CenteredMessage>
            <p>미리보기를 지원하지 않는 형식입니다</p>
          </CenteredMessage>
        ) : (!file || contentError) && isFileFetching ? (
          <CenteredMessage>원문을 불러오는 중…</CenteredMessage>
        ) : fileError || contentError || !file ? (
          <CenteredMessage>
            <p role="alert">
              {fileError ? toErrorMessage(fileError) : '원문을 불러오지 못했습니다.'}
            </p>
            <button
              type="button"
              onClick={handleRetryContent}
              className="rounded-md border border-border-dark-strong px-3 py-1 text-ink-dim hover:text-ink"
            >
              다시 시도
            </button>
          </CenteredMessage>
        ) : ext === 'pdf' ? (
          <Suspense fallback={<CenteredMessage>PDF를 불러오는 중…</CenteredMessage>}>
            <PdfContent
              key={`${documentId}-${fileUpdatedAt}`}
              file={file}
              quotes={quotes}
              onError={handleContentError}
            />
          </Suspense>
        ) : (
          <MarkdownContent
            key={`${documentId}-${fileUpdatedAt}`}
            file={file}
            quotes={quotes}
            onError={handleContentError}
          />
        )}
      </div>
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm text-ink-muted">
      {children}
    </div>
  )
}
