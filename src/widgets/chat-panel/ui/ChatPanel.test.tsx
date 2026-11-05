import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetChatStore, useChatStore } from '@/features/ask-question'
import { resetTabStore, useTabStore } from '@/features/document-tabs'
import { useDocumentFilterStore } from '@/features/filter-documents'
import { mockServer, ok } from '@/shared/testing'
import { ChatPanel } from './ChatPanel'

const CONVERSATIONS = [
  {
    id: 'c1',
    userId: 'u1',
    title: '연차 이월은?',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

const DETAIL = {
  conversation: CONVERSATIONS[0],
  messages: [
    {
      id: 'm1',
      conversationId: 'c1',
      role: 'USER',
      content: '연차 이월은?',
      evidenceChunkIds: [],
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      conversationId: 'c1',
      role: 'ASSISTANT',
      content: '최대 5일까지 이월할 수 있습니다.',
      evidenceChunkIds: ['k1'],
      createdAt: '2026-01-01T00:00:10Z',
    },
  ],
}

const EVIDENCE = {
  chunkId: 'k1',
  documentId: 'd1',
  documentTitle: '연차 규정',
  extension: 'md',
  versionId: 'v1',
  versionNumber: 1,
  content: '연차는 최대 5일까지 이월된다.',
  charStart: 0,
  charEnd: 10,
  page: null,
  previousChunk: null,
  nextChunk: null,
  downloadUrl: 'https://example.com/signed',
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ChatPanel />
    </QueryClientProvider>,
  )
}

let restore: () => void = () => {}

describe('ChatPanel 대화 기록', () => {
  beforeEach(() => {
    resetChatStore()
    useDocumentFilterStore.getState().reset()
  })
  afterEach(() => restore())

  it('대화 기록에서 과거 대화를 고르면 채팅 화면에 다시 불러온다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/conversations') return ok(CONVERSATIONS)
      if (config.url === '/api/conversations/c1') return ok(DETAIL)
      if (config.url === '/api/evidence/k1') return ok(EVIDENCE)
      return ok(null)
    })
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: '대화 기록' }))
    expect(await screen.findByText('연차 이월은?')).toBeInTheDocument()

    await userEvent.click(screen.getByText('연차 이월은?'))

    expect(await screen.findByText('최대 5일까지 이월할 수 있습니다.')).toBeInTheDocument()
    expect(useChatStore.getState().conversationId).toBe('c1')
    expect(useChatStore.getState().evidenceDocumentIds).toEqual(['d1'])
  })

  it('"새 대화"를 누르면 지금 대화를 지운다', async () => {
    restore = mockServer((config) =>
      config.url === '/api/conversations' ? ok(CONVERSATIONS) : ok(null),
    )
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: '대화 기록' }))
    await userEvent.click(await screen.findByRole('button', { name: '새 대화' }))

    expect(useChatStore.getState().messages).toEqual([])
    expect(useChatStore.getState().conversationId).toBeNull()
  })
})

describe('ChatPanel 답변 인용', () => {
  beforeEach(() => {
    resetChatStore()
    resetTabStore()
  })

  it('답변 인용을 누르면 문서 ID, 제목, 청크 ID로 문서 탭을 연다', async () => {
    useChatStore.setState({
      conversationId: 'c1',
      messages: [
        {
          id: 'm1',
          kind: 'answer',
          text: '연차는 최대 5일까지 이월할 수 있습니다.',
          sources: [
            {
              id: 'chunk-42',
              text: '연차 이월 규정',
              source: 'local',
              documentId: 'doc-7',
              documentTitle: '취업규칙',
              versionId: 'v1',
              charStart: 0,
              charEnd: 8,
            },
          ],
          evidence: [],
        },
      ],
      evidenceDocumentIds: ['doc-7'],
    })

    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <ChatPanel />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /^1\s*취업규칙$/ }))

    expect(useTabStore.getState().activeTabId).toBe('doc-7')
    expect(useTabStore.getState().documentTabs).toEqual([
      expect.objectContaining({
        documentId: 'doc-7',
        title: '취업규칙',
        focusChunkId: 'chunk-42',
      }),
    ])
  })
})
