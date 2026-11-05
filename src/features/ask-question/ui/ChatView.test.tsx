import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerSource } from '@/entities/answer'
import { fail, mockServer, ok } from '@/shared/testing'
import { resetChatStore, useChatStore } from '../model/chatStore'
import { ChatView, NewConversationButton } from './ChatView'

const source = (id: string, documentId: string): AnswerSource => ({
  id,
  text: '연차는 다음 해로 최대 5일까지 이월할 수 있다.',
  source: 'local',
  documentId,
  documentTitle: `문서 ${documentId}`,
  versionId: 'v1',
  charStart: 0,
  charEnd: 10,
})

const answer = (conversationId: string, sources: AnswerSource[]) => ({
  conversationId,
  answer: '최대 5일까지 이월할 수 있습니다.',
  route: null,
  contextProbability: null,
  sources,
  failedSources: [],
  fallbackReason: null,
})

function renderChat(onOpenSource = vi.fn<(source: AnswerSource) => void>()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <NewConversationButton />
      <ChatView onOpenSource={onOpenSource} />
    </QueryClientProvider>,
  )
  return onOpenSource
}

async function ask(text: string) {
  await userEvent.type(screen.getByLabelText('질문'), text)
  await userEvent.click(screen.getByRole('button', { name: '질문 보내기' }))
}

let restore: () => void = () => {}

describe('ChatView', () => {
  beforeEach(() => resetChatStore())
  afterEach(() => restore())

  it('첫 질문은 새 대화로, 다음 질문은 같은 대화로 보낸다', async () => {
    const urls: string[] = []
    restore = mockServer((config) => {
      urls.push(config.url ?? '')
      return ok(answer('c1', [source('k1', 'd1')]))
    })
    renderChat()

    await ask('연차 이월은?')
    expect(await screen.findByText('최대 5일까지 이월할 수 있습니다.')).toBeInTheDocument()
    await ask('반차도 되나요?')
    await screen.findAllByText('최대 5일까지 이월할 수 있습니다.')

    expect(urls).toEqual(['/api/conversations/messages', '/api/conversations/c1/messages'])
  })

  it('근거를 누르면 해당 출처를 넘긴다', async () => {
    restore = mockServer(() => ok(answer('c1', [source('k1', 'd1')])))
    const onOpen = renderChat()

    await ask('연차 이월은?')
    await userEvent.click(await screen.findByRole('button', { name: '[1] 문서 d1' }))

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', documentId: 'd1' }))
  })

  it('새 질문을 하면 이전 답변의 근거 강조를 지운다', async () => {
    let call = 0
    restore = mockServer(() => {
      call += 1
      return call === 1
        ? ok(answer('c1', [source('k1', 'd1'), source('k2', 'd1'), source('k3', 'd2')]))
        : fail(502, 'AI_UNAVAILABLE')
    })
    renderChat()

    await ask('첫 질문')
    await screen.findByText('최대 5일까지 이월할 수 있습니다.')
    expect(useChatStore.getState().evidenceDocumentIds).toEqual(['d1', 'd2'])

    await ask('두 번째 질문')
    expect(await screen.findByRole('alert')).toHaveTextContent('AI 서버에 연결할 수 없습니다')
    expect(useChatStore.getState().evidenceDocumentIds).toEqual([])
  })

  it('새 대화를 시작하면 대화 내용과 대화 ID를 지운다', async () => {
    restore = mockServer(() => ok(answer('c1', [])))
    renderChat()

    await ask('질문')
    await screen.findByText('최대 5일까지 이월할 수 있습니다.')
    await userEvent.click(screen.getByRole('button', { name: '새 대화' }))

    expect(screen.queryByText('최대 5일까지 이월할 수 있습니다.')).not.toBeInTheDocument()
    expect(useChatStore.getState().conversationId).toBeNull()
  })
})
