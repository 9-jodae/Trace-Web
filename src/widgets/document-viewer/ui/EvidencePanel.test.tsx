import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
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
  content: '연차 유급휴가는 다음 해로 최대 5일까지 이월할 수 있다.',
  charStart: 15,
  charEnd: 22,
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

const ORIGINAL_TEXT = '# 취업규칙 원문\n\n사내 규정 본문입니다.'

let restore: () => void = () => {}

describe('인용 클릭부터 근거 표시까지 흐름', () => {
  beforeEach(() => {
    resetTabStore()
    resetChatStore()
  })

  afterEach(() => {
    restore()
    vi.restoreAllMocks()
  })

  it('채팅 인용을 누르면 문서 탭이 열리고 앞뒤 문맥과 하이라이트된 근거 구절이 보인다', async () => {
    const scrollSpy = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollSpy,
    })

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
            content: '반차는 오전과 오후로 나누어 신청한다.',
            charStart: null,
            charEnd: null,
            page: null,
            previousChunk: null,
            nextChunk: null,
          }),
        )
      }
      return fail(404, 'NOT_FOUND')
    })

    const { container } = renderHarness()

    await userEvent.click(screen.getByRole('button', { name: /^1\s*취업규칙$/ }))

    const evidenceSection = await screen.findByRole('region', { name: '답변 근거' })
    expect(within(evidenceSection).getByText('제14조 (연차 휴가의 사용)')).toBeInTheDocument()
    expect(
      within(evidenceSection).getByText('이월된 연차는 상반기 안에 먼저 사용한다.'),
    ).toBeInTheDocument()
    expect(within(evidenceSection).getByText('v2')).toBeInTheDocument()
    expect(within(evidenceSection).getByText('3쪽')).toBeInTheDocument()

    const mark = evidenceSection.querySelector('mark')
    expect(mark).not.toBeNull()
    expect(mark).toHaveTextContent('최대 5일까지')
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'center' })

    // 원문 영역도 아래에 함께 표시되며 EvidenceChunk.downloadUrl은 노출되지 않습니다.
    expect(await screen.findByText('사내 규정 본문입니다.')).toBeInTheDocument()
    expect(container.textContent).not.toContain('/api/documents/d1/versions/v2/download')

    // 같은 문서의 다른 인용(2번 취업규칙)을 누르면 새 탭 없이 근거만 바뀌고, null 위치는 전체 강조됩니다.
    await userEvent.click(screen.getByRole('button', { name: /^2\s*취업규칙$/ }))

    expect(useTabStore.getState().documentTabs).toHaveLength(1)
    const updatedSection = await screen.findByRole('region', { name: '답변 근거' })
    const fullMark =
      await within(updatedSection).findByText('반차는 오전과 오후로 나누어 신청한다.')
    expect(fullMark.tagName).toBe('MARK')

    // 그래프 노드 클릭처럼 chunkId 없이 같은 문서를 열면 근거 영역이 닫힙니다.
    await userEvent.click(screen.getByRole('button', { name: '그래프 노드 열기' }))
    expect(screen.queryByRole('region', { name: '답변 근거' })).not.toBeInTheDocument()
  })

  it('근거 영역을 접었다 펼칠 수 있고 닫기 버튼으로 닫을 수 있다', async () => {
    useTabStore.getState().openDocument({
      documentId: 'd1',
      title: '취업규칙',
      chunkId: 'c1',
    })

    restore = mockServer((config) => {
      if (config.url === '/api/documents/d1') return ok(sampleDetail)
      if (config.url === '/api/documents/d1/download') return file(ORIGINAL_TEXT)
      if (config.url === '/api/evidence/c1') return ok(makeEvidence())
      return fail(404, 'NOT_FOUND')
    })

    renderHarness()

    const evidenceSection = await screen.findByRole('region', { name: '답변 근거' })
    expect(await within(evidenceSection).findByText('최대 5일까지')).toBeInTheDocument()

    await userEvent.click(within(evidenceSection).getByRole('button', { name: '근거 접기' }))
    expect(within(evidenceSection).queryByText('최대 5일까지')).not.toBeInTheDocument()

    await userEvent.click(within(evidenceSection).getByRole('button', { name: '근거 펼치기' }))
    expect(within(evidenceSection).getByText('최대 5일까지')).toBeInTheDocument()

    await userEvent.click(within(evidenceSection).getByRole('button', { name: '답변 근거 닫기' }))
    expect(screen.queryByRole('region', { name: '답변 근거' })).not.toBeInTheDocument()
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
      if (config.url === '/api/evidence/outdated-chunk') return fail(404, 'NOT_FOUND')
      return fail(404, 'NOT_FOUND')
    })

    renderHarness()

    const evidenceSection = await screen.findByRole('region', { name: '답변 근거' })
    expect(await within(evidenceSection).findByRole('alert')).toHaveTextContent(
      '이 근거는 문서가 개정·삭제되었거나 볼 권한이 없어 표시할 수 없습니다',
    )
    expect(await screen.findByText('사내 규정 본문입니다.')).toBeInTheDocument()
  })

  it('그 밖의 오류면 오류 문구와 다시 시도 버튼을 보여주고 다시 시도할 수 있다', async () => {
    useTabStore.getState().openDocument({
      documentId: 'd1',
      title: '취업규칙',
      chunkId: 'c1',
    })

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

    const evidenceSection = await screen.findByRole('region', { name: '답변 근거' })
    expect(await within(evidenceSection).findByRole('alert')).toHaveTextContent(
      '서버 오류가 발생했습니다',
    )

    await userEvent.click(within(evidenceSection).getByRole('button', { name: '다시 시도' }))
    expect(await within(evidenceSection).findByText('최대 5일까지')).toBeInTheDocument()
  })
})
