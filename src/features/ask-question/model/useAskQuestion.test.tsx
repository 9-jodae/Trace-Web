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
})
