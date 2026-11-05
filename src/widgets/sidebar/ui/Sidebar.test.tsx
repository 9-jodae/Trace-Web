import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetChatStore, useChatStore } from '@/features/ask-question'
import { useTokenStore } from '@/shared/api'
import { fail, mockServer, ok } from '@/shared/testing'
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

function renderSidebar(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/', element: <Sidebar /> },
      { path: '/admin/documents', element: <Sidebar /> },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
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
    const items = within(recent)
      .getAllByRole('listitem')
      .map((item) => within(item).getAllByRole('button')[0])
    expect(items.map((item) => item?.textContent)).toEqual(['출장비 정산 순서는?', '연차 이월은?'])
    expect(within(recent).queryByText('지금 세션에서 보낸 질문')).not.toBeInTheDocument()
  })

  it('대화가 10개를 넘어도 자르지 않고 전부 보여준다', async () => {
    const many = Array.from({ length: 15 }, (_, index) => ({
      id: `c${index}`,
      userId: 'u1',
      title: `질문 ${index}`,
      createdAt: '2026-11-05T01:00:00Z',
      updatedAt: '2026-11-05T01:00:00Z',
    }))
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok(ME)
      if (config.url === '/api/conversations') return ok(many)
      return ok(null)
    })
    renderSidebar()

    const recent = await screen.findByRole('navigation', { name: '최근 질문' })
    expect(within(recent).getAllByRole('listitem')).toHaveLength(15)
    expect(within(recent).getByRole('button', { name: '질문 14' })).toBeInTheDocument()
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

  it('지금 열린 대화를 확인 후 삭제하면 목록에서 빼고 새 대화로 돌린다', async () => {
    const deleted: string[] = []
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok(ME)
      if (config.url === '/api/conversations') {
        return ok(CONVERSATIONS.filter((conversation) => !deleted.includes(conversation.id)))
      }
      if (config.method === 'delete' && config.url === '/api/conversations/c1') {
        deleted.push('c1')
        return ok({ deleted: true })
      }
      return ok(null)
    })
    useChatStore
      .getState()
      .loadConversation('c1', [{ id: 'q', kind: 'question', text: '연차 이월은?' }])
    renderSidebar()

    await userEvent.click(await screen.findByRole('button', { name: '‘연차 이월은?’ 대화 삭제' }))
    const dialog = screen.getByRole('dialog', { name: '대화 삭제' })
    expect(deleted).toEqual([])
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '연차 이월은?' })).not.toBeInTheDocument(),
    )
    expect(deleted).toEqual(['c1'])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '출장비 정산 순서는?' })).toBeInTheDocument()
    expect(useChatStore.getState().conversationId).toBeNull()
    expect(useChatStore.getState().messages).toEqual([])
  })

  it('다른 대화를 삭제하면 지금 대화는 그대로 두고, 취소하면 지우지 않는다', async () => {
    const deleted: string[] = []
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok(ME)
      if (config.url === '/api/conversations') {
        return ok(CONVERSATIONS.filter((conversation) => !deleted.includes(conversation.id)))
      }
      if (config.method === 'delete' && config.url === '/api/conversations/c2') {
        deleted.push('c2')
        return ok({ deleted: true })
      }
      return ok(null)
    })
    useChatStore
      .getState()
      .loadConversation('c1', [{ id: 'q', kind: 'question', text: '연차 이월은?' }])
    renderSidebar()

    const trash = await screen.findByRole('button', { name: '‘출장비 정산 순서는?’ 대화 삭제' })
    await userEvent.click(trash)
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleted).toEqual([])

    await userEvent.click(trash)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleted).toEqual(['c2']))
    expect(useChatStore.getState().conversationId).toBe('c1')
    expect(useChatStore.getState().messages).toHaveLength(1)
  })

  it('삭제에 실패하면 모달에 오류를 보여주고 목록과 대화를 그대로 둔다', async () => {
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok(ME)
      if (config.url === '/api/conversations') return ok(CONVERSATIONS)
      if (config.method === 'delete') return fail(500, 'INTERNAL_ERROR')
      return ok(null)
    })
    useChatStore
      .getState()
      .loadConversation('c1', [{ id: 'q', kind: 'question', text: '연차 이월은?' }])
    renderSidebar()

    await userEvent.click(await screen.findByRole('button', { name: '‘연차 이월은?’ 대화 삭제' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('대화를 삭제하지 못했습니다.')
    expect(screen.getByRole('button', { name: '연차 이월은?', current: true })).toBeInTheDocument()
    expect(useChatStore.getState().conversationId).toBe('c1')
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

describe('Sidebar 문서 관리 버튼', () => {
  beforeEach(() => {
    resetChatStore()
    useTokenStore.setState({ accessToken: 'token' })
  })
  afterEach(() => restore())

  const serveAs = (role: string) => {
    restore = mockServer((config) => {
      if (config.url === '/api/users/me') return ok({ ...ME, role })
      if (config.url === '/api/conversations') return ok([])
      return ok(null)
    })
  }

  it('직원 역할이면 문서 관리 버튼을 숨긴다', async () => {
    serveAs('EMPLOYEE')
    renderSidebar()
    await screen.findByText('데모')
    expect(screen.queryByRole('button', { name: '문서 관리' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '질문하기' })).toHaveAttribute('aria-current', 'page')
  })

  it('관리자 역할이면 문서 관리로 이동하고 선택 상태를 바꾼다', async () => {
    serveAs('DOC_ADMIN')
    const router = renderSidebar()
    const admin = await screen.findByRole('button', { name: '문서 관리' })

    await userEvent.click(admin)

    expect(router.state.location.pathname).toBe('/admin/documents')
    expect(await screen.findByRole('button', { name: '문서 관리' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await userEvent.click(screen.getByRole('button', { name: '질문하기' }))
    expect(router.state.location.pathname).toBe('/')
  })
})
