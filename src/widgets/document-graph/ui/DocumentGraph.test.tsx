import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { fail, mockServer, ok } from '@/shared/testing'
import { DocumentGraph } from './DocumentGraph'

function renderGraph() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <DocumentGraph />
    </QueryClientProvider>,
  )
}

const page = (items: unknown[]) =>
  ok({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 })

/** 문서 목록 요청에는 주어진 응답을, 부서 목록(필터 바) 요청에는 빈 배열을 돌려줍니다. */
function serveDocuments(reply: () => ReturnType<typeof page> | ReturnType<typeof fail>) {
  return mockServer((config) => (config.url === '/api/departments' ? ok([]) : reply()))
}

let restore: () => void = () => {}

describe('DocumentGraph', () => {
  afterEach(() => restore())

  it('볼 수 있는 문서가 없으면 안내한다', async () => {
    restore = serveDocuments(() => page([]))
    renderGraph()
    expect(await screen.findByText('볼 수 있는 문서가 없습니다.')).toBeInTheDocument()
  })

  it('불러오기에 실패하면 오류와 다시 시도 버튼을 보여준다', async () => {
    restore = mockServer(() => fail(500, 'INTERNAL_ERROR'))
    renderGraph()
    expect(await screen.findByRole('alert')).toHaveTextContent('서버 오류가 발생했습니다')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('WebGL을 쓸 수 없으면 그래프 대신 안내한다', async () => {
    restore = serveDocuments(() =>
      page([{ id: 'd1', title: '연차 규정', documentType: 'ETC', deletedAt: null }]),
    )
    renderGraph()
    expect(
      await screen.findByText('이 브라우저에서는 그래프를 표시할 수 없습니다.'),
    ).toBeInTheDocument()
  })
})
