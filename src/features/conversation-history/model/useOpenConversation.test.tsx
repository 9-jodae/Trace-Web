import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { mockServer, ok } from '@/shared/testing'
import { useOpenConversation } from './useOpenConversation'

const detail = (id: string) => ({
  conversation: {
    id,
    userId: 'u1',
    title: id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  messages: [
    {
      id: `${id}-m1`,
      conversationId: id,
      role: 'USER',
      content: `${id} 질문`,
      evidenceChunkIds: [],
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
})

function renderOpen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useOpenConversation(), { wrapper }).result
}

let restore: () => void = () => {}

describe('useOpenConversation', () => {
  afterEach(() => restore())

  it('나중에 시작한 대화 열기가 있으면 늦게 끝난 이전 결과는 null로 버린다', async () => {
    let releaseFirst: () => void = () => {}
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    restore = mockServer(async (config) => {
      if (config.url === '/api/conversations/a') {
        await firstGate
        return ok(detail('a'))
      }
      return ok(detail('b'))
    })
    const result = renderOpen()

    const first = result.current.open('a')
    const second = await result.current.open('b')
    releaseFirst()

    expect(second?.[0]).toMatchObject({ text: 'b 질문' })
    expect(await first).toBeNull()
  })
})
