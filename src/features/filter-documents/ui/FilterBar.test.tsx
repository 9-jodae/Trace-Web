import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockServer, ok } from '@/shared/testing'
import { useDocumentFilterStore } from '../model/filterStore'
import { FilterBar } from './FilterBar'
import { FilterDropdown, FilterDropdownGroup } from './FilterControls'

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

  it('바깥을 누르거나 Escape를 누르면 열린 드롭다운이 닫힌다', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <FilterBar />
        <p>바깥</p>
      </QueryClientProvider>,
    )

    const trigger = screen.getByRole('button', { name: '문서 유형' })
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByText('보고서'))
    expect(screen.getByText('보고서')).toBeInTheDocument()

    await userEvent.click(screen.getByText('바깥'))
    expect(screen.queryByText('보고서')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('보고서')).not.toBeInTheDocument()
  })
})

describe('FilterDropdownGroup', () => {
  it('이름이 같은 드롭다운도 서로 따로 열린다', async () => {
    render(
      <FilterDropdownGroup>
        <FilterDropdown label="필터" active={false}>
          <p>첫째</p>
        </FilterDropdown>
        <FilterDropdown label="필터" active={false}>
          <p>둘째</p>
        </FilterDropdown>
      </FilterDropdownGroup>,
    )

    const [first, second] = screen.getAllByRole('button', { name: '필터' })
    await userEvent.click(first!)
    expect(screen.getByText('첫째')).toBeInTheDocument()
    expect(screen.queryByText('둘째')).not.toBeInTheDocument()

    await userEvent.click(second!)
    expect(screen.queryByText('첫째')).not.toBeInTheDocument()
    expect(screen.getByText('둘째')).toBeInTheDocument()
  })
})
