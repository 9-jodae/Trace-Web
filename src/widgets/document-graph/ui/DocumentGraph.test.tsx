import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '@/features/ask-question'
import { fail, mockServer, ok } from '@/shared/testing'
import { DocumentGraph } from './DocumentGraph'

// jsdom에는 WebGL이 없어 sigma를 그릴 수 없습니다. 캔버스는 비워 두고 그 위의 패널만 확인합니다.
vi.mock('./SigmaCanvas', () => ({ default: () => null }))

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

/**
 * 문서 목록 요청에는 주어진 응답을, 부서 목록(필터 바)과 관계 그래프 요청에는
 * 빈 응답을 돌려줍니다. 관계 그래프는 실패해도 노드 자체는 그대로 보여야 하므로
 * (widgets/document-graph/ui/DocumentGraph.tsx 참고) 기본은 빈 그래프로 둡니다.
 */
function serveDocuments(reply: () => ReturnType<typeof page> | ReturnType<typeof fail>) {
  return mockServer((config) => {
    if (config.url === '/api/departments') return ok([])
    if (config.url === '/api/graph') return ok({ nodes: [], edges: [] })
    return reply()
  })
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

  it('근거가 있어도 그래프는 오류 없이 범례를 보여준다', async () => {
    vi.stubGlobal('WebGL2RenderingContext', class {})
    useChatStore.setState({ evidenceDocumentIds: ['d1'], graphHighlightEnabled: true })
    restore = mockServer((config) => {
      if (config.url === '/api/departments') return ok([])
      if (config.url === '/api/graph') {
        return ok({
          nodes: [],
          edges: [
            {
              id: 'e1',
              source: 'd1',
              target: 'd2',
              type: 'REFERENCES',
              label: '참조',
              detail: null,
            },
          ],
        })
      }
      return page([
        { id: 'd1', title: '출장비 규정', documentType: 'ETC', deletedAt: null },
        { id: 'd2', title: '경비 결재 절차', documentType: 'APPROVAL', deletedAt: null },
        { id: 'd3', title: '연차 규정', documentType: 'ETC', deletedAt: null },
      ])
    })
    renderGraph()

    expect(await screen.findByLabelText('문서 유형 범례')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: '근거 포커스' })).not.toBeInTheDocument()

    useChatStore.setState({ evidenceDocumentIds: [], graphHighlightEnabled: true })
    vi.unstubAllGlobals()
  })
})
