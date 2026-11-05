import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { useTabStore } from '@/features/document-tabs'
import {
  documentKeys,
  getDownloadUrl,
  useDocument,
  useDocumentStatus,
  useDownloadUrl,
  type ProcessingStatus,
} from '@/entities/document'
import { ApiRequestError, toErrorMessage } from '@/shared/api'
import { MarkdownContent } from './MarkdownContent'

const PdfContent = lazy(() => import('./PdfContent'))

function normalizeExtension(extension: string): string {
  return extension.toLowerCase().replace(/^\./, '')
}

function StatusBadge({ status }: { status: ProcessingStatus | null }) {
  if (status === 'PENDING' || status === 'PROCESSING') {
    return (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        처리 중
      </span>
    )
  }
  if (status === 'FAILED') {
    return (
      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        처리 실패
      </span>
    )
  }
  return null
}

/**
 * 문서 탭에서 문서 메타데이터와 원문(PDF·Markdown)을 보여줍니다.
 * presigned URL은 화면 텍스트나 콘솔에 노출하지 않으며 만료 시 재발급받아 다시 시도합니다.
 */
export function DocumentViewer({ documentId }: { documentId: string }) {
  const queryClient = useQueryClient()
  const closeDocument = useTabStore((state) => state.closeDocument)

  const { data, isPending, error, refetch } = useDocument(documentId)

  const initialJobStatus = data?.job?.status ?? null
  const shouldPollStatus = initialJobStatus === 'PENDING' || initialJobStatus === 'PROCESSING'
  const { data: polledJob } = useDocumentStatus(documentId, shouldPollStatus)

  const currentJob = polledJob !== undefined ? polledJob : (data?.job ?? null)
  const ext = data ? normalizeExtension(data.document.extension) : ''
  const isPreviewable = ext === 'pdf' || ext === 'md'

  const {
    data: downloadData,
    isPending: isDownloadPending,
    error: downloadError,
  } = useDownloadUrl(documentId, Boolean(data) && isPreviewable)

  const [attempt, setAttempt] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [contentError, setContentError] = useState(false)
  const [downloadActionError, setDownloadActionError] = useState<string | null>(null)
  const retryingRef = useRef(false)

  const handleContentError = useCallback(async () => {
    if (attempt === 0 && !retryingRef.current) {
      retryingRef.current = true
      setIsRetrying(true)
      try {
        await queryClient.invalidateQueries({
          queryKey: documentKeys.downloadUrl(documentId),
        })
        setAttempt(1)
      } catch {
        setContentError(true)
      } finally {
        setIsRetrying(false)
        retryingRef.current = false
      }
      return
    }
    setContentError(true)
  }, [attempt, documentId, queryClient])

  const handleManualRetryContent = useCallback(async () => {
    setContentError(false)
    setIsRetrying(true)
    try {
      await queryClient.invalidateQueries({
        queryKey: documentKeys.downloadUrl(documentId),
      })
      setAttempt(0)
    } finally {
      setIsRetrying(false)
    }
  }, [documentId, queryClient])

  const handleDownload = useCallback(async () => {
    setDownloadActionError(null)
    try {
      const fresh = await queryClient.fetchQuery({
        queryKey: documentKeys.downloadUrl(documentId),
        queryFn: () => getDownloadUrl(documentId),
        staleTime: 0,
      })
      window.open(fresh.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setDownloadActionError(toErrorMessage(err))
    }
  }, [documentId, queryClient])

  if (isPending) {
    return <CenteredMessage>문서를 불러오는 중…</CenteredMessage>
  }

  if (error) {
    const isNotFound =
      error instanceof ApiRequestError && (error.status === 404 || error.code === 'NOT_FOUND')
    if (isNotFound) {
      return (
        <CenteredMessage>
          <p role="alert">문서를 찾을 수 없거나 볼 권한이 없습니다</p>
          <button
            type="button"
            onClick={() => closeDocument(documentId)}
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
          >
            탭 닫기
          </button>
        </CenteredMessage>
      )
    }
    return (
      <CenteredMessage>
        <p role="alert">{toErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
        >
          다시 시도
        </button>
      </CenteredMessage>
    )
  }

  const { document } = data

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-900">{document.title}</h2>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                v{document.currentVersion}
              </span>
              <StatusBadge status={currentJob?.status ?? null} />
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{document.relativePath}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            다운로드
          </button>
        </div>
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <dt className="text-slate-400">유형</dt>
            <dd>{document.documentType ?? '분류 전'}</dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="text-slate-400">작성자</dt>
            <dd>{document.author ?? '-'}</dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="text-slate-400">작성일</dt>
            <dd>{document.authoredAt ?? '-'}</dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="text-slate-400">보안 등급</dt>
            <dd>{document.clearance}</dd>
          </div>
        </dl>
        {downloadActionError && (
          <p role="alert" className="text-xs text-red-600">
            {downloadActionError}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {!isPreviewable ? (
          <CenteredMessage>
            <p>미리보기를 지원하지 않는 형식입니다</p>
          </CenteredMessage>
        ) : isDownloadPending || isRetrying ? (
          <CenteredMessage>원문을 불러오는 중…</CenteredMessage>
        ) : downloadError || contentError || !downloadData ? (
          <CenteredMessage>
            <p role="alert">
              {downloadError ? toErrorMessage(downloadError) : '원문을 불러오지 못했습니다.'}
            </p>
            <button
              type="button"
              onClick={() => void handleManualRetryContent()}
              className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
            >
              다시 시도
            </button>
          </CenteredMessage>
        ) : ext === 'pdf' ? (
          <Suspense fallback={<CenteredMessage>PDF를 불러오는 중…</CenteredMessage>}>
            <PdfContent
              key={`${documentId}-${attempt}`}
              url={downloadData.url}
              onError={() => void handleContentError()}
            />
          </Suspense>
        ) : (
          <MarkdownContent
            documentId={documentId}
            url={downloadData.url}
            attempt={attempt}
            onError={() => void handleContentError()}
          />
        )}
      </div>
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm text-slate-400">
      {children}
    </div>
  )
}
