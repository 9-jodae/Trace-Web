import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fail, mockServer, ok } from '@/shared/testing'
import { resetChatStore, useChatStore } from './chatStore'
import { useAskQuestion, useIsAsking } from './useAskQuestion'

type Reply = ReturnType<typeof ok>

const answer = ok({
  conversationId: 'c1',
  answer: '답변입니다.',
  route: null,
  contextProbability: null,
  sources: [],
  failedSources: [],
  fallbackReason: null,
})

/** 응답을 테스트가 원하는 시점에 돌려주도록 서버 응답을 붙잡아 둡니다. */
function deferServer() {
  let respond: (reply: Reply) => void = () => {}
  const restore = mockServer(
    () =>
      new Promise<Reply>((resolve) => {
        respond = resolve
      }),
  )
  return { restore, respond: (reply: Reply) => respond(reply) }
}

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const asker = renderHook(() => useAskQuestion(), { wrapper })
  const pending = renderHook(() => useIsAsking(), { wrapper })
  return { asker, pending }
}

let restore: () => void = () => {}

describe('useAskQuestion', () => {
  beforeEach(() => resetChatStore())
  afterEach(() => restore())

  // 홈 화면에서 첫 질문을 보내면 HomeComposer가 사라진 뒤에 응답이 옵니다.
  it('질문한 컴포넌트가 응답 전에 사라져도 답변을 대화에 남긴다', async () => {
    const server = deferServer()
    restore = server.restore
    const { asker, pending } = setup()

    act(() => asker.result.current.ask('연차 이월은?'))
    await waitFor(() => expect(pending.result.current).toBe(true))
    asker.unmount()
    await act(async () => server.respond(answer))

    await waitFor(() => expect(pending.result.current).toBe(false))
    const { conversationId, messages } = useChatStore.getState()
    expect(conversationId).toBe('c1')
    expect(messages).toEqual([
      expect.objectContaining({ kind: 'question', text: '연차 이월은?' }),
      expect.objectContaining({ kind: 'answer', text: '답변입니다.', evidence: [] }),
    ])
  })

  it('질문한 컴포넌트가 응답 전에 사라져도 오류를 대화에 남긴다', async () => {
    const server = deferServer()
    restore = server.restore
    const { asker, pending } = setup()

    act(() => asker.result.current.ask('연차 이월은?'))
    await waitFor(() => expect(pending.result.current).toBe(true))
    asker.unmount()
    await act(async () => server.respond(fail(502, 'AI_UNAVAILABLE')))

    await waitFor(() => expect(pending.result.current).toBe(false))
    expect(useChatStore.getState().messages.at(-1)).toEqual(
      expect.objectContaining({ kind: 'error' }),
    )
  })

  // 응답을 기다리는 동안 대화가 바뀌면 늦게 온 답변이 바뀐 화면에 붙으면 안 됩니다.
  it.each([
    ['새 대화를 시작하면', () => useChatStore.getState().startNewConversation()],
    ['로그아웃으로 대화가 초기화되면', () => resetChatStore()],
    [
      '다른 대화를 열면',
      () =>
        useChatStore
          .getState()
          .loadConversation('c9', [{ id: 'h1', kind: 'question', text: '다른 대화의 질문' }]),
    ],
  ])('질문한 뒤 %s 늦게 도착한 답변은 버린다', async (_label, changeConversation) => {
    const server = deferServer()
    restore = server.restore
    const { asker, pending } = setup()

    act(() => asker.result.current.ask('연차 이월은?'))
    await waitFor(() => expect(pending.result.current).toBe(true))
    act(() => changeConversation())
    const before = useChatStore.getState()
    await act(async () => server.respond(answer))

    await waitFor(() => expect(pending.result.current).toBe(false))
    const after = useChatStore.getState()
    expect(after.messages).toEqual(before.messages)
    expect(after.conversationId).toBe(before.conversationId)
  })

  it('질문한 뒤 대화가 바뀌면 늦게 도착한 오류도 버린다', async () => {
    const server = deferServer()
    restore = server.restore
    const { asker, pending } = setup()

    act(() => asker.result.current.ask('연차 이월은?'))
    await waitFor(() => expect(pending.result.current).toBe(true))
    act(() => resetChatStore())
    await act(async () => server.respond(fail(502, 'AI_UNAVAILABLE')))

    await waitFor(() => expect(pending.result.current).toBe(false))
    expect(useChatStore.getState().messages).toEqual([])
  })
})
