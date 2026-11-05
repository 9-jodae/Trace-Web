import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatView, resetChatStore, useChatStore } from '@/features/ask-question'
import { GRAPH_TAB_ID, resetTabStore, TabBar, useTabStore } from '@/features/document-tabs'
import type { AnswerSource } from '@/entities/answer'
import type { DocumentDetail } from '@/entities/document'
import type { EvidenceChunk } from '@/entities/evidence'
import { fail, file, mockServer, ok } from '@/shared/testing'
import { DocumentViewer } from './DocumentViewer'

const sampleDetail: DocumentDetail = {
  document: {
    id: 'd1',
    sourceId: 's1',
    externalId: 'ext-1',
    title: '취업규칙',
    relativePath: 'hr/rules.md',
    extension: 'md',
    documentType: 'REPORT',
    author: '인사팀',
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
      contentHash: 'hash',
      uploadedBy: 'u1',
      createdAt: '2026-03-01T00:00:00Z',
    },
  ],
  job: null,
}

const makeEvidence = (overrides: Partial<EvidenceChunk> = {}): EvidenceChunk => ({
  chunkId: 'c1',
  documentId: 'd1',
  documentTitle: '취업규칙',
  extension: 'md',
  versionId: 'v2',
  versionNumber: 2,
  content: '## 제14조 연차\n\n연차 유급휴가는 다음 해로 최대 **5일까지** 이월할 수 있다.',
  charStart: 0,
  charEnd: 10,
  page: 3,
  previousChunk: '제14조 (연차 휴가의 사용)',
  nextChunk: '이월된 연차는 상반기 안에 먼저 사용한다.',
  downloadUrl: '/api/documents/d1/versions/v2/download',
  ...overrides,
})

const makeSource = (id: string, documentId = 'd1', documentTitle = '취업규칙'): AnswerSource => ({
  id,
  text: '연차 유급휴가는 다음 해로 최대 5일까지 이월할 수 있다.',
  source: 'local',
  documentId,
  documentTitle,
  versionId: 'v2',
  charStart: 15,
  charEnd: 22,
})

function TestHarness() {
  const activeTabId = useTabStore((state) => state.activeTabId)
  const openDocument = useTabStore((state) => state.openDocument)

  return (
    <div>
      <TabBar />
      <button type="button" onClick={() => openDocument({ documentId: 'd1', title: '취업규칙' })}>
        그래프 노드 열기
      </button>
      {activeTabId === GRAPH_TAB_ID ? (
        <div>그래프 화면</div>
      ) : (
        <DocumentViewer key={activeTabId} documentId={activeTabId} />
      )}
      <ChatView
        onOpenSource={(source) =>
          openDocument({
            documentId: source.documentId,
            title: source.documentTitle,
            chunkId: source.id,
          })
        }
      />
    </div>
  )
}

function renderHarness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TestHarness />
    </QueryClientProvider>,
  )
}

const ORIGINAL_TEXT =
  '# 취업규칙 원문\n\n## 제14조 연차\n\n연차 유급휴가는 다음 해로 최대 **5일까지** 이월할 수 있다.\n\n' +
  '## 제15조 반차\n\n반차는 오전과 오후로 나누어 신청한다.'

/** jsdom에는 CSS Custom Highlight API가 없어 칠한 범위를 확인할 수 있게 흉내 냅니다. */
function stubHighlightApi() {
  const registry = new Map<string, Set<Range>>()
  vi.stubGlobal('CSS', { highlights: registry })
  vi.stubGlobal('Highlight', class extends Set<Range> {})
  return () =>
    [...(registry.get('evidence-text') ?? [])].map((range) => range.toString().replace(/\s+/g, ' '))
}

let restore: () => void = () => {}

describe('인용 클릭부터 원문 안 근거 표시까지 흐름', () => {
  let painted: () => string[]
  let scrollSpy: ReturnType<typeof vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>>

  beforeEach(() => {
    resetTabStore()
    resetChatStore()
    painted = stubHighlightApi()
    scrollSpy = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollSpy,
    })
  })

  afterEach(() => {
    restore()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('채팅 근거를 누르면 원문 위에 덮지 않고, 인용이 없으면 청크 전체를 칠하지 않은 채 근거 위치로 이동한다', async () => {
    useChatStore.setState({
      conversationId: 'conv-1',
      messages: [
        {
          id: 'm1',
          kind: 'answer',
          text: '최대 5일까지 이월할 수 있습니다.',
          sources: [makeSource('c1'), makeSource('c2')],
          evidence: [],
        },
      ],
      evidenceDocumentIds: ['d1'],
    })

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(sampleDetail)
      if (config.url === '/api/documents/d1/download') return file(ORIGINAL_TEXT)
      if (config.url === '/api/evidence/c1') return ok(makeEvidence())
      if (config.url === '/api/evidence/c2') {
        return ok(
          makeEvidence({
            chunkId: 'c2',
            content: '## 제15조 반차\n\n반차는 오전과 오후로 나누어 신청한다.',
            charStart: null,
            charEnd: null,
            page: null,
          }),
        )
      }
      return fail(404, 'NOT_FOUND')
    })

    const { container } = renderHarness()

    await userEvent.click(screen.getByRole('button', { name: /^1\s*취업규칙$/ }))

    const bar = await screen.findByRole('region', { name: '답변 근거' })
    expect(
      await within(bar).findByText('표시할 핵심 문구가 없어 근거 위치로 이동했습니다'),
    ).toBeInTheDocument()
    expect(within(bar).getByText('v2')).toBeInTheDocument()
    expect(within(bar).getByText('3쪽')).toBeInTheDocument()

    // 근거 청크를 덮개로 다시 그리지 않습니다. 앞뒤 문맥 청크도 따로 보여주지 않습니다.
    expect(container.querySelector('mark')).toBeNull()
    expect(screen.queryByText('제14조 (연차 휴가의 사용)')).not.toBeInTheDocument()
    expect(painted()).toEqual([])
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'center' })
    expect(container.textContent).not.toContain('/api/documents/d1/versions/v2/download')

    // 같은 문서의 다른 근거를 누르면 새 탭 없이 그 근거 위치로 이동합니다.
    scrollSpy.mockClear()
    await userEvent.click(screen.getByRole('button', { name: /^2\s*취업규칙$/ }))
    expect(useTabStore.getState().documentTabs).toHaveLength(1)
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled())
    expect(painted()).toEqual([])

    // 그래프 노드 클릭처럼 chunkId 없이 같은 문서를 열면 근거 표시가 사라집니다.
    await userEvent.click(screen.getByRole('button', { name: '그래프 노드 열기' }))
    expect(screen.queryByRole('region', { name: '답변 근거' })).not.toBeInTheDocument()
    await waitFor(() => expect(painted()).toEqual([]))
  })

  it('인용과 청크 안 키워드만 칠하고, 근거로 이동과 닫기를 할 수 있다', async () => {
    useTabStore.getState().openDocument({
      documentId: 'd1',
      title: '취업규칙',
      chunkId: 'c1',
      highlights: { quotes: ['반차는 오전과 오후로'], keywords: ['다음 해로', '나누어'] },
    })

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(sampleDetail)
      if (config.url === '/api/documents/d1/download') return file(ORIGINAL_TEXT)
      if (config.url === '/api/evidence/c1') return ok(makeEvidence())
      return fail(404, 'NOT_FOUND')
    })

    renderHarness()

    const bar = await screen.findByRole('region', { name: '답변 근거' })
    await within(bar).findByText('원문에 표시했습니다')
    // 인용은 다른 청크에 있어도 칠하고, 키워드는 누른 청크(제14조) 안의 것만 칠합니다.
    expect(painted()).toEqual(['다음 해로', '반차는 오전과 오후로'])

    scrollSpy.mockClear()
    await userEvent.click(within(bar).getByRole('button', { name: '근거로 이동' }))
    expect(scrollSpy).toHaveBeenCalledTimes(1)

    await userEvent.click(within(bar).getByRole('button', { name: '답변 근거 닫기' }))
    expect(screen.queryByRole('region', { name: '답변 근거' })).not.toBeInTheDocument()
    await waitFor(() => expect(painted()).toEqual([]))
  })

  it('원문에서 근거를 못 찾으면 버전 차이를 알려준다', async () => {
    useTabStore.getState().openDocument({ documentId: 'd1', title: '취업규칙', chunkId: 'c1' })

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(sampleDetail)
      if (config.url === '/api/documents/d1/download') return file(ORIGINAL_TEXT)
      if (config.url === '/api/evidence/c1') {
        return ok(makeEvidence({ versionNumber: 1, content: '개정 전에만 있던 문장이다.' }))
      }
      return fail(404, 'NOT_FOUND')
    })

    renderHarness()

    expect(await screen.findByRole('status')).toHaveTextContent(
      '근거는 v1 기준이라 지금 원문(v2)에서 위치를 찾지 못했습니다',
    )
    expect(painted()).toEqual([])
  })

  it('근거 조회가 404이면 구분 없는 안내 문구를 보여주고 원문 영역은 정상 동작한다', async () => {
    useTabStore.getState().openDocument({
      documentId: 'd1',
      title: '취업규칙',
      chunkId: 'outdated-chunk',
    })

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(sampleDetail)
      if (config.url === '/api/documents/d1/download') return file(ORIGINAL_TEXT)
      return fail(404, 'NOT_FOUND')
    })

    renderHarness()

    const bar = await screen.findByRole('region', { name: '답변 근거' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent(
      '이 근거는 문서가 개정·삭제되었거나 볼 권한이 없어 표시할 수 없습니다',
    )
    expect(await screen.findByText('반차는 오전과 오후로 나누어 신청한다.')).toBeInTheDocument()
  })

  it('그 밖의 오류면 오류 문구와 다시 시도 버튼을 보여주고 다시 시도할 수 있다', async () => {
    useTabStore.getState().openDocument({ documentId: 'd1', title: '취업규칙', chunkId: 'c1' })

    let evidenceCalls = 0
    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(sampleDetail)
      if (config.url === '/api/documents/d1/download') return file(ORIGINAL_TEXT)
      if (config.url === '/api/evidence/c1') {
        evidenceCalls += 1
        return evidenceCalls === 1 ? fail(500, 'INTERNAL_ERROR') : ok(makeEvidence())
      }
      return fail(404, 'NOT_FOUND')
    })

    renderHarness()

    const bar = await screen.findByRole('region', { name: '답변 근거' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent('서버 오류가 발생했습니다')

    await userEvent.click(within(bar).getByRole('button', { name: '다시 시도' }))
    expect(
      await within(bar).findByText('표시할 핵심 문구가 없어 근거 위치로 이동했습니다'),
    ).toBeInTheDocument()
  })
})
