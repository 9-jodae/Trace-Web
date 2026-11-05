import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTokenStore } from '@/shared/api'
import { fail, mockServer, ok } from '@/shared/testing'
import { AdminDocumentsPage } from './AdminDocumentsPage'

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

const DOC = {
  id: 'd1',
  sourceId: 's1',
  externalId: '공통/규정/출장비.md',
  title: '출장비',
  relativePath: '공통/규정/출장비.md',
  extension: 'md',
  documentType: null,
  author: null,
  authoredAt: '2026-03-01',
  clearance: 'INTERNAL',
  minimumPosition: null,
  currentVersion: 2,
  deletedAt: null,
  ownerDepartmentId: null,
  sourceModifiedAt: null,
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/admin/documents', element: <AdminDocumentsPage /> },
      { path: '/admin/documents/:id', element: <p>상세 화면</p> },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

let restore: () => void = () => {}
let listParams: unknown[] = []

function serve(overrides: { sources?: unknown; documents?: () => unknown } = {}) {
  listParams = []
  restore = mockServer((config) => {
    if (config.url === '/api/users/me') return ok(ME)
    if (config.url === '/api/conversations') return ok([])
    if (config.url === '/api/departments') return ok([])
    if (config.url === '/api/admin/sources') return ok(overrides.sources ?? SOURCES)
    if (config.url === '/api/admin/documents') {
      listParams.push(config.params)
      if (overrides.documents) return overrides.documents() as never
      return ok({ items: [DOC], page: 0, size: 20, totalElements: 21, totalPages: 2 })
    }
    return fail(404, 'NOT_FOUND')
  })
}

describe('AdminDocumentsPage', () => {
  beforeEach(() => useTokenStore.setState({ accessToken: 'token' }))
  afterEach(() => restore())

  it('문서 표를 보여주고 제목을 누르면 상세로 이동한다', async () => {
    serve()
    const router = renderAt('/admin/documents')

    const row = (await screen.findByRole('link', { name: '출장비' })).closest('tr')!
    expect(within(row).getByText('공통/규정/출장비.md')).toBeInTheDocument()
    expect(within(row).getByText('분류 전')).toBeInTheDocument()
    expect(within(row).getByText('사내')).toBeInTheDocument()
    expect(within(row).getByText('—')).toBeInTheDocument()
    expect(within(row).getByText('v2')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: '출장비' }))
    expect(router.state.location.pathname).toBe('/admin/documents/d1')
  })

  it('소스·필터·페이지를 URL 쿼리와 요청 파라미터에 반영한다', async () => {
    serve()
    const router = renderAt('/admin/documents')
    await screen.findByRole('link', { name: '출장비' })

    await userEvent.selectOptions(screen.getByLabelText('소스'), 's1')
    await userEvent.selectOptions(screen.getByLabelText('처리 상태'), 'FAILED')
    await userEvent.click(screen.getByRole('button', { name: '다음 페이지' }))

    expect(router.state.location.search).toBe('?source=s1&status=FAILED&page=1')
    expect(listParams.at(-1)).toEqual({ sourceId: 's1', status: 'FAILED', page: 1, size: 20 })
  })

  it('빈 결과와 소스가 없는 경우를 안내한다', async () => {
    serve({
      documents: () => ok({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    })
    renderAt('/admin/documents')
    expect(await screen.findByText('조건에 맞는 문서가 없습니다')).toBeInTheDocument()
    restore()

    serve({ sources: [] })
    renderAt('/admin/documents')
    expect(await screen.findByText('소스를 먼저 추가하세요')).toBeInTheDocument()
  })

  it('403이면 관리 권한이 없다고 알린다', async () => {
    serve({ documents: () => fail(403, 'FORBIDDEN') })
    renderAt('/admin/documents')
    expect(await screen.findByRole('alert')).toHaveTextContent('문서 관리 권한이 없습니다.')
  })
})
