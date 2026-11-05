import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTokenStore } from '@/shared/api'
import { fail, mockServer, ok } from '@/shared/testing'
import { AdminDocumentDetailPage } from './AdminDocumentDetailPage'

const ME = {
  id: 'u1',
  email: 'doc.admin@local.docs199',
  name: '문서 관리자',
  departmentId: 'dep1',
  department: '경영지원팀',
  position: 'MANAGER',
  role: 'DOC_ADMIN',
  clearance: 'CONFIDENTIAL',
}

const DEPARTMENTS = [
  { id: 'dep1', name: '경영지원팀' },
  { id: 'dep2', name: '인사팀' },
]

const SOURCES = [
  {
    id: 's1',
    kind: 'OBSIDIAN',
    name: '사내 위키',
    defaultDepartmentId: null,
    defaultClearance: 'PUBLIC',
    createdBy: 'u1',
  },
]

function makeDetail(job: unknown = null) {
  return {
    document: {
      id: 'd1',
      sourceId: 's1',
      externalId: '공통/규정/출장비.md',
      title: '출장비',
      relativePath: '공통/규정/출장비.md',
      extension: 'md',
      documentType: 'REPORT',
      author: '정서윤',
      authoredAt: '2026-03-01',
      clearance: 'INTERNAL',
      minimumPosition: 'MANAGER',
      currentVersion: 2,
      deletedAt: null,
      ownerDepartmentId: 'dep1',
      sourceModifiedAt: null,
    },
    departmentIds: ['dep2'],
    versions: [
      {
        id: 'v1',
        number: 1,
        fileSize: 2048,
        contentHash: 'aaaaaaaa11111111',
        uploadedBy: 'u1',
        createdAt: '2026-03-01T00:00:00Z',
      },
      {
        id: 'v2',
        number: 2,
        fileSize: 3 * 1024 * 1024,
        contentHash: 'bbbbbbbb22222222',
        uploadedBy: 'u1',
        createdAt: '2026-03-02T00:00:00Z',
      },
    ],
    job,
  }
}

function renderAt(path = '/admin/documents/d1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/admin/documents', element: <p>목록 화면</p> },
      { path: '/admin/documents/:id', element: <AdminDocumentDetailPage /> },
    ],
    { initialEntries: [{ pathname: path, state: { from: '?status=FAILED' } }] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

let restore: () => void = () => {}

function serve(detail: () => unknown, extra?: (url: string) => unknown) {
  restore = mockServer((config) => {
    const url = config.url ?? ''
    const handled = extra?.(url)
    if (handled) return handled as never
    if (url === '/api/users/me') return ok(ME)
    if (url === '/api/conversations') return ok([])
    if (url === '/api/departments') return ok(DEPARTMENTS)
    if (url === '/api/admin/sources') return ok(SOURCES)
    if (url === '/api/admin/documents/d1') return detail() as never
    return fail(404, 'NOT_FOUND')
  })
}

describe('AdminDocumentDetailPage', () => {
  beforeEach(() => useTokenStore.setState({ accessToken: 'token' }))
  afterEach(() => {
    restore()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('기본 정보·권한·버전 이력을 보여준다', async () => {
    serve(() => ok(makeDetail()))
    renderAt()

    expect(await screen.findByRole('heading', { name: '출장비' })).toBeInTheDocument()
    expect(screen.getByText('처리 요청 전')).toBeInTheDocument()
    const info = screen.getByRole('region', { name: '기본 정보' })
    expect(await within(info).findByText('사내 위키 · Obsidian')).toBeInTheDocument()
    expect(await within(info).findByText('경영지원팀')).toBeInTheDocument()
    const access = screen.getByRole('region', { name: '열람 권한' })
    expect(within(access).getByText('사내')).toBeInTheDocument()
    expect(within(access).getByText('인사팀')).toBeInTheDocument()
    expect(within(access).getByText('팀장')).toBeInTheDocument()
    const rows = within(screen.getByRole('region', { name: '버전 이력' })).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('v2')
    expect(rows[1]).toHaveTextContent('3.0 MB')
    expect(rows[1]).toHaveTextContent('bbbbbbbb')
    expect(rows[1]).not.toHaveTextContent('22222222')
  })

  it('처리 중이면 5초마다 다시 불러오고 끝나면 멈춘다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let calls = 0
    serve(() => {
      calls += 1
      const status = calls >= 2 ? 'DONE' : 'PROCESSING'
      return ok(
        makeDetail({
          id: 'j1',
          versionId: 'v2',
          status,
          errorMessage: null,
          startedAt: '2026-03-02T00:00:00Z',
          finishedAt: status === 'DONE' ? '2026-03-02T00:01:00Z' : null,
        }),
      )
    })
    renderAt()

    expect(await screen.findByText(/처리 중/)).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await screen.findByText(/완료/)).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toBe(2)
  })

  it('실패하면 사유와 우회 방법을, 이전 버전 결과면 그 사실을 보여준다', async () => {
    serve(() =>
      ok(
        makeDetail({
          id: 'j1',
          versionId: 'v1',
          status: 'FAILED',
          errorMessage: 'PDF 텍스트를 추출하지 못했습니다',
          startedAt: null,
          finishedAt: null,
        }),
      ),
    )
    renderAt()
    expect(await screen.findByText('PDF 텍스트를 추출하지 못했습니다')).toBeInTheDocument()
    expect(screen.getByText(/같은 경로로 다시 올리면/)).toBeInTheDocument()
    expect(screen.getByText('이전 버전의 처리 결과')).toBeInTheDocument()
  })

  it('원문 열기는 누를 때 URL을 받아 새 창으로 열고 화면에 URL을 남기지 않는다', async () => {
    const secret = 'https://storage.local/doc.md?X-Amz-Signature=secret'
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    serve(
      () => ok(makeDetail()),
      (url) => (url === '/api/admin/documents/d1/download-url' ? ok({ url: secret }) : undefined),
    )
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: '원문 열기' }))

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(secret, '_blank', 'noopener,noreferrer'),
    )
    expect(document.body.textContent).not.toContain(secret)
  })

  it('404면 삭제되었을 수 있다고 알리고 이전 필터로 목록에 돌아간다', async () => {
    serve(() => fail(404, 'NOT_FOUND'))
    const router = renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '문서를 찾을 수 없습니다(삭제되었을 수 있습니다)',
    )
    await userEvent.click(screen.getByRole('link', { name: '목록으로 가기' }))
    expect(router.state.location.pathname).toBe('/admin/documents')
    expect(router.state.location.search).toBe('?status=FAILED')
  })
})
