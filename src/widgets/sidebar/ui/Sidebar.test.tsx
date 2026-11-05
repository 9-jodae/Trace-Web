import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetChatStore, useChatStore } from '@/features/ask-question'
import { mockServer, ok } from '@/shared/testing'
import { Sidebar } from './Sidebar'

const ME = {
  id: 'u1',
  email: 'demo@example.com',
  name: '데모',
  departmentId: 'dep1',
  department: '인사팀',
  position: 'STAFF',
  role: 'EMPLOYEE',
  clearance: 'PUBLIC',
}

const CONVERSATIONS = [
  {
    id: 'c2',
    userId: 'u1',
    title: '출장비 정산 순서는?',
    createdAt: '2026-11-05T01:00:00Z',
    updatedAt: '2026-11-05T02:00:00Z',
  },
  {
    id: 'c1',
    userId: 'u1',
    title: '연차 이월은?',
    createdAt: '2026-11-04T01:00:00Z',
    updatedAt: '2026-11-04T01:00:00Z',
  },
]

const DETAIL_C1 = {
  conversation: CONVERSATIONS[1],
  messages: [
    {
      id: 'm1',
      conversationId: 'c1',
      role: 'USER',
      content: '연차 이월은?',
      evidenceChunkIds: [],
      createdAt: '2026-11-04T01:00:00Z',
    },
    {
      id: 'm2',
      conversationId: 'c1',
      role: 'ASSISTANT',
      content: '최대 5일까지 이월할 수 있습니다.',
      evidenceChunkIds: [],
      createdAt: '2026-11-04T01:00:10Z',
    },
  ],
}

function renderSidebar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <Sidebar />
    </QueryClientProvider>,
  )
}

let restore: () => void = () => {}

describe('Sidebar 최근 질문', () => {
  beforeEach(() => resetChatStore())
  afterEach(() => restore())

  it('이번 세션의 질문이 아니라 서버에 저장된 최근 대화 목록을 보여준다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok(ME)
      if (config.url === '/api/conversations') return ok(CONVERSATIONS)
      return ok(null)
    })
    useChatStore.getState().addQuestion('지금 세션에서 보낸 질문')
    renderSidebar()

    const recent = await screen.findByRole('navigation', { name: '최근 질문' })
    const items = within(recent).getAllByRole('button')
    expect(items.map((item) => item.textContent)).toEqual(['출장비 정산 순서는?', '연차 이월은?'])
    expect(within(recent).queryByText('지금 세션에서 보낸 질문')).not.toBeInTheDocument()
  })

  it('최근 대화를 누르면 그 대화를 채팅으로 다시 불러온다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok(ME)
      if (config.url === '/api/conversations') return ok(CONVERSATIONS)
      if (config.url === '/api/conversations/c1') return ok(DETAIL_C1)
      return ok(null)
    })
    renderSidebar()

    await userEvent.click(await screen.findByRole('button', { name: '연차 이월은?' }))

    await screen.findByRole('button', { name: '연차 이월은?', current: true })
    const state = useChatStore.getState()
    expect(state.conversationId).toBe('c1')
    expect(state.messages.map((message) => message.kind)).toEqual(['question', 'answer'])
  })

  it('저장된 대화가 없으면 최근 질문 영역을 숨긴다', async () => {
    let listed = false
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok(ME)
      if (config.url === '/api/conversations') {
        listed = true
        return ok([])
      }
      return ok(null)
    })
    renderSidebar()

    await waitFor(() => expect(listed).toBe(true))
    expect(await screen.findByRole('button', { name: '새 질문' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '최근 질문' })).not.toBeInTheDocument()
  })
})
