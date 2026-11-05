import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetChatStore, useChatStore } from '@/features/ask-question'
import { resetTabStore, useTabStore } from '@/features/document-tabs'
import { ChatPanel } from './ChatPanel'

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
