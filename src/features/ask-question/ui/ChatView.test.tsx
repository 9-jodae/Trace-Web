import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerEvidence, AnswerSource } from '@/entities/answer'
import { fail, mockServer, ok } from '@/shared/testing'
import { resetChatStore, useChatStore } from '../model/chatStore'
import { ChatView } from './ChatView'

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

const evidenceItem = (chunkId: string, documentId: string): AnswerEvidence => ({
  chunkId,
  source: `문서 ${documentId}`,
  documentId,
  versionId: 'v1',
  quote: '연차는 최대 5일까지 이월할 수 있다.',
  charStart: 10,
  charEnd: 20,
})

const answer = (
  conversationId: string,
  sources: AnswerSource[],
  evidence: AnswerEvidence[] = [],
) => ({
  conversationId,
  answer: '최대 5일까지 이월할 수 있습니다.',
  route: null,
  contextProbability: null,
  sources,
  evidence,
  failedSources: [],
  fallbackReason: null,
})

function renderChat(onOpenSource = vi.fn<(source: AnswerSource) => void>()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
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
    await userEvent.click(await screen.findByRole('button', { name: /문서 d1/ }))

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', documentId: 'd1' }))
  })

  it('핵심 인용을 보여주고 누르면 그 문서를 넘긴다', async () => {
    restore = mockServer(() => ok(answer('c1', [source('k1', 'd1')], [evidenceItem('e1', 'd1')])))
    const onOpen = renderChat()

    await ask('연차 이월은?')
    await userEvent.click(await screen.findByText(/연차는 최대 5일까지 이월할 수 있다/))

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', documentId: 'd1' }))
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

  // "새 대화" 버튼은 widgets/sidebar로 옮겨졌으므로 여기서는 스토어 동작만 확인합니다.
  it('새 대화를 시작하면 대화 내용과 대화 ID를 지운다', async () => {
    restore = mockServer(() => ok(answer('c1', [source('k1', 'd1')])))
    renderChat()

    await ask('질문')
    await screen.findByText('최대 5일까지 이월할 수 있습니다.')
    act(() => useChatStore.getState().startNewConversation())

    expect(screen.queryByText('최대 5일까지 이월할 수 있습니다.')).not.toBeInTheDocument()
    expect(useChatStore.getState().conversationId).toBeNull()
  })

  it('근거가 없어도 답변 문장을 그대로 보여주고 재시도 버튼을 함께 보여준다', async () => {
    restore = mockServer(() => ok(answer('c1', [])))
    renderChat()

    await ask('환율 기준일은?')

    expect(await screen.findByText('최대 5일까지 이월할 수 있습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '필터 해제하고 다시 찾기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다른 표현으로 질문' })).toBeInTheDocument()
  })

  it('"다른 표현으로 질문"을 누르면 원래 질문을 입력창에 채운다', async () => {
    restore = mockServer(() => ok(answer('c1', [])))
    renderChat()

    await ask('환율 기준일은?')
    await userEvent.click(await screen.findByRole('button', { name: '다른 표현으로 질문' }))

    expect(screen.getByLabelText('질문')).toHaveValue('환율 기준일은?')
  })

  it('"필터 해제하고 다시 찾기"를 누르면 필터를 지우고 같은 질문을 다시 보낸다', async () => {
    const urls: string[] = []
    restore = mockServer((config) => {
      urls.push(config.url ?? '')
      return ok(answer('c1', []))
    })
    const onClearFilters = vi.fn<() => void>()
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ChatView
          onOpenSource={vi.fn<(source: AnswerSource) => void>()}
          onClearFilters={onClearFilters}
        />
      </QueryClientProvider>,
    )

    await ask('환율 기준일은?')
    await userEvent.click(await screen.findByRole('button', { name: '필터 해제하고 다시 찾기' }))

    await screen.findAllByText('최대 5일까지 이월할 수 있습니다.')
    expect(onClearFilters).toHaveBeenCalledTimes(1)
    expect(urls).toEqual(['/api/conversations/messages', '/api/conversations/c1/messages'])
  })
})
