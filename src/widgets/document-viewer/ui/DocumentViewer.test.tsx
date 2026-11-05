import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTabStore, useTabStore } from '@/features/document-tabs'
import type { DocumentDetail, IngestionJob } from '@/entities/document'
import { fail, mockServer, ok } from '@/shared/testing'
import { DocumentViewer } from './DocumentViewer'

let pdfShouldFail = false

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
  Document: ({
    children,
    onLoadSuccess,
    onLoadError,
  }: {
    children: React.ReactNode
    file?: string
    onLoadSuccess?: (pdf: { numPages: number }) => void
    onLoadError?: (error: Error) => void
  }) => {
    useEffect(() => {
      if (pdfShouldFail) {
        onLoadError?.(new Error('PDF failed https://secret.storage.local/expired.pdf'))
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
  documentType?: string | null
  job?: IngestionJob | null
}): DocumentDetail {
  return {
    document: {
      id: 'd1',
      sourceId: 's1',
      externalId: 'ext-1',
      title: '연차 휴가 규정',
      relativePath: '인사/규정/leave-policy.md',
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

describe('DocumentViewer', () => {
  beforeEach(() => {
    resetTabStore()
    pdfShouldFail = false
  })

  afterEach(() => {
    restore()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('MD 문서 상세 정보와 원문을 보여주고 presigned URL이나 원시 HTML은 노출하지 않는다', async () => {
    const secretUrl = 'https://storage.local/bucket/leave-policy.md?X-Amz-Signature=secret123'
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    const consoleLog = vi.spyOn(console, 'log')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('# 연차 안내\n\n- 최대 5일 이월\n\n<script>alert(1)</script>', {
          status: 200,
        }),
      ),
    )

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'md' }))
      if (config.url === '/api/documents/d1/download-url') return ok({ url: secretUrl })
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
    expect(container.textContent).not.toContain(secretUrl)
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining(secretUrl))
    expect(consoleWarn).not.toHaveBeenCalledWith(expect.stringContaining(secretUrl))
    expect(consoleLog).not.toHaveBeenCalledWith(expect.stringContaining(secretUrl))
  })

  it('PDF 문서는 전체 페이지를 세로로 이어 보여준다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') {
        return ok(makeDetail({ extension: 'pdf', documentType: 'REPORT' }))
      }
      if (config.url === '/api/documents/d1/download-url') {
        return ok({ url: 'https://storage.local/report.pdf?sig=1' })
      }
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('REPORT')).toBeInTheDocument()
    expect(await screen.findByTestId('pdf-page-1')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page-2')).toBeInTheDocument()
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('본문', { status: 200 })))

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
      if (config.url === '/api/documents/d1/download-url') {
        return ok({ url: 'https://storage.local/doc.md' })
      }
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('본문', { status: 200 })))

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
      if (config.url === '/api/documents/d1/download-url') {
        return ok({ url: 'https://storage.local/doc.md' })
      }
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('처리 실패')).toBeInTheDocument()
    expect(screen.queryByText(/NullPointerException/)).not.toBeInTheDocument()
  })

  it('지원하지 않는 확장자는 안내 문구와 다운로드 버튼을 보여주고 다운로드 시 새 URL을 발급받는다', async () => {
    let downloadUrlCalls = 0
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'docx' }))
      if (config.url === '/api/documents/d1/download-url') {
        downloadUrlCalls += 1
        return ok({ url: `https://storage.local/file-${downloadUrlCalls}.docx` })
      }
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('미리보기를 지원하지 않는 형식입니다')).toBeInTheDocument()
    expect(downloadUrlCalls).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: '다운로드' }))
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://storage.local/file-1.docx',
        '_blank',
        'noopener,noreferrer',
      )
    })

    await userEvent.click(screen.getByRole('button', { name: '다운로드' }))
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://storage.local/file-2.docx',
        '_blank',
        'noopener,noreferrer',
      )
    })
  })

  it('원문 로드 실패 시 downloadUrl을 무효화해 한 번 다시 시도하고 성공하면 원문을 보여준다', async () => {
    let urlVersion = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('v=1')) return Promise.resolve(new Response(null, { status: 403 }))
        return Promise.resolve(new Response('재발급 후 정상 로드된 본문', { status: 200 }))
      }),
    )

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'md' }))
      if (config.url === '/api/documents/d1/download-url') {
        urlVersion += 1
        return ok({ url: `https://storage.local/doc.md?v=${urlVersion}` })
      }
      return fail(404, 'NOT_FOUND')
    })

    renderViewer('d1')

    expect(await screen.findByText('재발급 후 정상 로드된 본문')).toBeInTheDocument()
    expect(urlVersion).toBe(2)
  })

  it('재시도 후에도 원문 로드에 실패하면 URL 없이 오류 문구와 다시 시도 버튼을 보여준다', async () => {
    let urlVersion = 0
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(makeDetail({ extension: 'md' }))
      if (config.url === '/api/documents/d1/download-url') {
        urlVersion += 1
        return ok({ url: `https://storage.local/secret-doc.md?v=${urlVersion}` })
      }
      return fail(404, 'NOT_FOUND')
    })

    const { container } = renderViewer('d1')

    expect(await screen.findByRole('alert')).toHaveTextContent('원문을 불러오지 못했습니다.')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(urlVersion).toBe(2)
    expect(container.textContent).not.toContain('https://storage.local')
  })

  it('탭을 바꿨다 돌아와 다시 마운트되어도 TanStack Query 캐시로 다시 요청하지 않는다', async () => {
    let detailCalls = 0
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('캐시 본문', { status: 200 })))

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') {
        detailCalls += 1
        return ok(makeDetail({ extension: 'md' }))
      }
      if (config.url === '/api/documents/d1/download-url') {
        return ok({ url: 'https://storage.local/doc.md' })
      }
      return fail(404, 'NOT_FOUND')
    })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })

    const first = renderViewer('d1', client)
    expect(await screen.findByText('캐시 본문')).toBeInTheDocument()
    expect(detailCalls).toBe(1)

    first.unmount()

    renderViewer('d1', client)
    expect(await screen.findByText('캐시 본문')).toBeInTheDocument()
    expect(detailCalls).toBe(1)
  })
})
