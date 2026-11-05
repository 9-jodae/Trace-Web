import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockServer, ok } from '@/shared/testing'
import { useDocumentFilterStore } from '../model/filterStore'
import { FilterBar } from './FilterBar'

const page = (items: unknown[]) =>
  ok({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 })

const doc = {
  id: 'd1',
  sourceId: 's1',
  externalId: 'd1.pdf',
  title: '문서 1',
  relativePath: 'd1.pdf',
  extension: 'pdf',
  documentType: 'REPORT',
  author: null,
  authoredAt: null,
  clearance: 'PUBLIC',
  minimumPosition: null,
  currentVersion: 1,
  deletedAt: null,
  ownerDepartmentId: null,
  sourceModifiedAt: null,
}

let restore: () => void = () => {}

describe('FilterBar 드롭다운', () => {
  beforeEach(() => {
    useDocumentFilterStore.getState().reset()
    restore = mockServer((config) => {
      if (config.url === '/api/documents') return page([doc])
      if (config.url === '/api/departments') return ok([])
      return ok(null)
    })
  })
  afterEach(() => restore())

  it('하나가 열린 상태에서 다른 드롭다운을 열면 이전 드롭다운은 닫힌다', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <FilterBar />
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByText('문서 유형'))
    expect(screen.getByText('보고서')).toBeInTheDocument()

    await userEvent.click(screen.getByText('확장자'))
    expect(screen.queryByText('보고서')).not.toBeInTheDocument()
    expect(await screen.findByText('.pdf')).toBeInTheDocument()

    await userEvent.click(screen.getByText('작성 기간'))
    expect(screen.queryByText('.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('시작일')).toBeInTheDocument()

    await userEvent.click(screen.getByText('작성 기간'))
    expect(screen.queryByText('시작일')).not.toBeInTheDocument()
  })
})
