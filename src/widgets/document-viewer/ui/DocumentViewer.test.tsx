import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InternalAxiosRequestConfig } from 'axios'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTabStore, useTabStore } from '@/features/document-tabs'
import type { DocumentDetail, IngestionJob } from '@/entities/document'
import { useTokenStore } from '@/shared/api'
import { fail, file, mockServer, ok, stubDownload } from '@/shared/testing'
import { DocumentViewer } from './DocumentViewer'

let pdfShouldFail = false
let lastPdfFile: unknown

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
  Document: ({
    children,
    file: pdfFile,
    onLoadSuccess,
    onLoadError,
  }: {
    children: React.ReactNode
    file?: unknown
    onLoadSuccess?: (pdf: { numPages: number }) => void
    onLoadError?: (error: Error) => void
  }) => {
    lastPdfFile = pdfFile
    useEffect(() => {
      if (pdfShouldFail) {
        onLoadError?.(new Error('Invalid PDF structure'))
      } else {
        onLoadSuccess?.({ numPages: 2 })
      }
    }, [onLoadError, onLoadSuccess])
    return <div data-testid="pdf-document">{children}</div>
  },
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`pdf-page-${pageNumber}`}>페이지 {pageNumber}</div>
  ),
}))

function makeDetail(overrides: {
  extension?: string
  relativePath?: string
  documentType?: string | null
  job?: IngestionJob | null
}): DocumentDetail {
  return {
    document: {
      id: 'd1',
      sourceId: 's1',
      externalId: 'ext-1',
      title: '연차 휴가 규정',
      relativePath: overrides.relativePath ?? '인사/규정/leave-policy.md',
      extension: overrides.extension ?? 'md',
      documentType: overrides.documentType !== undefined ? overrides.documentType : null,
      author: '정서윤',
      authoredAt: '2026-03-01',
      clearance: 'INTERNAL',
      minimumPosition: null,
      currentVersion: 2,
      deletedAt: null,
      ownerDepartmentId: 'dept-1',
      sourceModifiedAt: '2026-03-01T00:00:00Z',
    },
    departmentIds: ['dept-1'],
    versions: [
      {
        id: 'v2',
        number: 2,
        fileSize: 1024,
        contentHash: 'hash2',
        uploadedBy: 'u1',
        createdAt: '2026-03-01T00:00:00Z',
      },
    ],
    job: overrides.job ?? null,
  }
}

/** 다운로드 API의 실제 오류처럼 응답 봉투를 Blob 본문에 담습니다. */
function blobFail(status: number, code: string) {
  return {
    status,
    body: new Blob([JSON.stringify({ success: false, data: null, error: { code, message: '' } })]),
  }
}

function renderViewer(documentId = 'd1', client?: QueryClient) {
  const queryClient =
    client ?? new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentViewer documentId={documentId} />
    </QueryClientProvider>,
  )
}

let restore: () => void = () => {}
let download: ReturnType<typeof stubDownload>

describe('DocumentViewer', () => {
  beforeEach(() => {
    resetTabStore()
    pdfShouldFail = false
    lastPdfFile = undefined
    useTokenStore.setState({ accessToken: 'token-1' })
    download = stubDownload()
  })

  afterEach(() => {
    restore()
    download.restore()
    useTokenStore.setState({ accessToken: null })
    vi.restoreAllMocks()
  })

  it('MD 원문은 인증 헤더를 붙여 받고 원시 HTML 없이 보여주며, 다운로드는 받은 파일을 그대로 저장한다', async () => {
    const downloads: InternalAxiosRequestConfig[] = []
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'md' }))
      if (config.url === '/api/documents/d1/download') {
        downloads.push(config)
        return file('# 연차 안내\n\n- 최대 5일 이월\n\n<script>alert(1)</script>', 'text/markdown')
      }
      return fail(404, 'NOT_FOUND')
    })

    const { container } = renderViewer('d1')

    expect(await screen.findByRole('heading', { name: '연차 휴가 규정' })).toBeInTheDocument()
    expect(screen.getByText('인사/규정/leave-policy.md')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
    expect(screen.getByText('분류 전')).toBeInTheDocument()
    expect(screen.getByText('정서윤')).toBeInTheDocument()
    expect(screen.getByText('2026-03-01')).toBeInTheDocument()
    expect(screen.getByText('INTERNAL')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: '연차 안내' })).toBeInTheDocument()
    expect(screen.getByText('최대 5일 이월')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()

    expect(downloads).toHaveLength(1)
    expect(downloads[0]?.responseType).toBe('blob')
    expect(downloads[0]?.headers.Authorization).toBe('Bearer token-1')
    expect(fetchSpy).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: '다운로드' }))

    await waitFor(() => expect(download.saved).toHaveLength(1))
    expect(download.saved[0]?.fileName).toBe('leave-policy.md')
    expect(await download.saved[0]?.blob?.text()).toContain('# 연차 안내')
    expect(downloads).toHaveLength(1)
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('PDF 문서는 받은 파일을 react-pdf에 넘겨 전체 페이지를 세로로 이어 보여준다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') {
        return ok(makeDetail({ extension: 'pdf', documentType: 'REPORT' }))
      }
      if (config.url === '/api/documents/d1/download') return file('%PDF-1.7', 'application/pdf')
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('REPORT')).toBeInTheDocument()
    expect(await screen.findByTestId('pdf-page-1')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page-2')).toBeInTheDocument()
    expect(lastPdfFile).toBeInstanceOf(Blob)
  })

  it('404이면 권한·존재를 구분하지 않는 문구와 탭 닫기 버튼을 보여준다', async () => {
    useTabStore.getState().openDocument({ documentId: 'd1', title: '비밀 문서' })
    restore = mockServer(() => fail(404, 'NOT_FOUND'))

    renderViewer('d1')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '문서를 찾을 수 없거나 볼 권한이 없습니다',
    )
    await userEvent.click(screen.getByRole('button', { name: '탭 닫기' }))
    expect(useTabStore.getState().documentTabs).toEqual([])
  })

  it('처리 중 문서는 상태를 표시하고 처리가 끝나면 새로고침 없이 사라진다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let statusCalls = 0

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') {
        const isDone = statusCalls >= 2
        return ok(
          makeDetail({
            documentType: isDone ? 'HANDOVER' : null,
            job: {
              id: 'j1',
              versionId: 'v2',
              status: isDone ? 'DONE' : 'PROCESSING',
              errorMessage: null,
              startedAt: '2026-03-01T00:00:00Z',
              finishedAt: isDone ? '2026-03-01T00:01:00Z' : null,
            },
          }),
        )
      }
      if (config.url === '/api/documents/d1/status') {
        statusCalls += 1
        const isDone = statusCalls >= 2
        return ok({
          id: 'j1',
          versionId: 'v2',
          status: isDone ? 'DONE' : 'PROCESSING',
          errorMessage: null,
          startedAt: '2026-03-01T00:00:00Z',
          finishedAt: isDone ? '2026-03-01T00:01:00Z' : null,
        })
      }
      if (config.url === '/api/documents/d1/download') return file('본문')
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('처리 중')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(5_000)

    await waitFor(() => {
      expect(screen.queryByText('처리 중')).not.toBeInTheDocument()
    })
    expect(await screen.findByText('HANDOVER')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('처리 실패 문서는 내부 오류 문구를 숨기고 처리 실패만 표시한다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') {
        return ok(
          makeDetail({
            job: {
              id: 'j1',
              versionId: 'v2',
              status: 'FAILED',
              errorMessage: 'Internal stack trace: NullPointerException at Parser.java:42',
              startedAt: '2026-03-01T00:00:00Z',
              finishedAt: '2026-03-01T00:01:00Z',
            },
          }),
        )
      }
      if (config.url === '/api/documents/d1/download') return file('본문')
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('처리 실패')).toBeInTheDocument()
    expect(screen.queryByText(/NullPointerException/)).not.toBeInTheDocument()
  })

  it('지원하지 않는 확장자는 원문을 미리 받지 않고, 다운로드를 누르면 받아서 원래 파일 이름으로 저장한다', async () => {
    let downloadCalls = 0

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') {
        return ok(makeDetail({ extension: 'docx', relativePath: '인사/양식/휴가 신청서.docx' }))
      }
      if (config.url === '/api/documents/d1/download') {
        downloadCalls += 1
        return file('docx 내용')
      }
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('미리보기를 지원하지 않는 형식입니다')).toBeInTheDocument()
    expect(downloadCalls).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: '다운로드' }))
    await waitFor(() => expect(download.saved).toHaveLength(1))
    expect(download.saved[0]?.fileName).toBe('휴가 신청서.docx')
    expect(downloadCalls).toBe(1)

    // 같은 버전은 내용이 같으므로 다시 받지 않고 저장만 다시 합니다.
    await userEvent.click(screen.getByRole('button', { name: '다운로드' }))
    await waitFor(() => expect(download.saved).toHaveLength(2))
    expect(downloadCalls).toBe(1)
  })

  it('다운로드에 실패하면 헤더에 오류 문구를 보여준다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'docx' }))
      if (config.url === '/api/documents/d1/download') return blobFail(502, 'STORAGE_ERROR')
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    await userEvent.click(await screen.findByRole('button', { name: '다운로드' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '파일 저장소에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
    )
    expect(download.saved).toHaveLength(0)
  })

  it('원문을 받지 못하면 서버 오류 문구와 다시 시도 버튼을 보여주고, 다시 시도해 성공하면 원문을 보여준다', async () => {
    let downloadCalls = 0

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'md' }))
      if (config.url === '/api/documents/d1/download') {
        downloadCalls += 1
        return downloadCalls === 1 ? blobFail(404, 'NOT_FOUND') : file('다시 받은 본문')
      }
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '찾을 수 없거나 볼 수 있는 권한이 없습니다.',
    )
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('다시 받은 본문')).toBeInTheDocument()
    expect(downloadCalls).toBe(2)
  })

  it('PDF를 그리지 못하면 오류 문구와 다시 시도 버튼을 보여주고 다시 시도할 수 있다', async () => {
    pdfShouldFail = true

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'pdf' }))
      if (config.url === '/api/documents/d1/download') return file('%PDF-1.7', 'application/pdf')
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByRole('alert')).toHaveTextContent('원문을 불러오지 못했습니다.')

    pdfShouldFail = false
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByTestId('pdf-page-1')).toBeInTheDocument()
  })

  it('탭을 바꿨다 돌아와 다시 마운트되어도 TanStack Query 캐시로 다시 요청하지 않는다', async () => {
    let detailCalls = 0
    let downloadCalls = 0

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') {
        detailCalls += 1
        return ok(makeDetail({ extension: 'md' }))
      }
      if (config.url === '/api/documents/d1/download') {
        downloadCalls += 1
        return file('캐시 본문')
      }
      return fail(404, 'NOT_FOUND')
    })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })

    const first = renderViewer('d1', client)
    expect(await screen.findByText('캐시 본문')).toBeInTheDocument()
    expect(detailCalls).toBe(1)
    expect(downloadCalls).toBe(1)

    first.unmount()

    renderViewer('d1', client)
    expect(await screen.findByText('캐시 본문')).toBeInTheDocument()
    expect(detailCalls).toBe(1)
    expect(downloadCalls).toBe(1)
  })
})
