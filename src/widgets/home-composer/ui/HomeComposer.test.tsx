import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetChatStore, useChatStore } from '@/features/ask-question'
import { useDocumentFilterStore } from '@/features/filter-documents'
import { mockServer, ok } from '@/shared/testing'
import { HomeComposer } from './HomeComposer'

const page = (items: unknown[]) =>
  ok({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 })

const doc = (id: string, documentType: string | null) => ({
  id,
  sourceId: 's1',
  externalId: `${id}.md`,
  title: `문서 ${id}`,
  relativePath: `${id}.md`,
  extension: 'pdf',
  documentType,
  author: null,
  authoredAt: null,
  clearance: 'PUBLIC',
  minimumPosition: null,
  currentVersion: 1,
  deletedAt: null,
  ownerDepartmentId: null,
  sourceModifiedAt: null,
})

const answer = ok({
  conversationId: 'c1',
  answer: '답변입니다.',
  route: null,
  contextProbability: null,
  sources: [],
  evidence: [],
  failedSources: [],
  fallbackReason: null,
})

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <HomeComposer />
    </QueryClientProvider>,
  )
}

let restore: () => void = () => {}

describe('HomeComposer', () => {
  beforeEach(() => {
    resetChatStore()
    useDocumentFilterStore.getState().reset()
  })
  afterEach(() => restore())

  it('추천 질문을 누르면 그 질문을 그대로 보낸다', async () => {
    let body: unknown
    restore = mockServer((config) => {
      if (config.url === '/api/documents') return page([doc('d1', 'REPORT')])
      if (config.url === '/api/departments') return ok([])
      body = config.data ? JSON.parse(config.data as string) : undefined
      return answer
    })
    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: '법인카드 정산 순서' }))

    await waitFor(() => expect(useChatStore.getState().conversationId).toBe('c1'))
    expect(body).toEqual({ message: '법인카드 정산 순서' })
  })

  it('문서 유형 필터를 고르고 질문하면 질문 검색 필터로 같이 보낸다', async () => {
    let body: { filters?: unknown } = {}
    restore = mockServer((config) => {
      if (config.url === '/api/documents') return page([doc('d1', 'REPORT')])
      if (config.url === '/api/departments') return ok([])
      body = config.data ? JSON.parse(config.data as string) : {}
      return answer
    })
    renderHome()

    await userEvent.click(await screen.findByText('필터'))
    await userEvent.click(await screen.findByText('보고서'))
    await userEvent.type(screen.getByLabelText('질문'), '질문입니다')
    await userEvent.click(screen.getByRole('button', { name: '질문 보내기' }))

    await waitFor(() => expect(useChatStore.getState().conversationId).toBe('c1'))
    expect(body.filters).toEqual({ documentTypes: ['REPORT'] })
  })
})
