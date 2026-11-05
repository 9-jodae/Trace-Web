import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FilterDropdown } from './FilterControls'

function details(label: string) {
  return screen.getByText(label).closest('details') as HTMLDetailsElement
}

function renderTwoDropdowns() {
  render(
    <>
      <FilterDropdown label="문서함" active={false}>
        <p>문서함 내용</p>
      </FilterDropdown>
      <FilterDropdown label="필터" active={false}>
        <p>필터 내용</p>
      </FilterDropdown>
      <button type="button">바깥</button>
    </>,
  )
}

describe('FilterDropdown', () => {
  it('다른 필터 버튼을 누르면 먼저 연 패널은 닫혀 두 패널이 겹치지 않는다', async () => {
    renderTwoDropdowns()

    await userEvent.click(screen.getByText('문서함'))
    await waitFor(() => expect(details('문서함').open).toBe(true))

    await userEvent.click(screen.getByText('필터'))
    await waitFor(() => expect(details('필터').open).toBe(true))
    expect(details('문서함').open).toBe(false)
  })

  it('패널 바깥을 누르거나 Esc를 누르면 닫는다', async () => {
    renderTwoDropdowns()

    await userEvent.click(screen.getByText('필터'))
    await waitFor(() => expect(details('필터').open).toBe(true))
    await userEvent.click(screen.getByRole('button', { name: '바깥' }))
    expect(details('필터').open).toBe(false)

    await userEvent.click(screen.getByText('필터'))
    await waitFor(() => expect(details('필터').open).toBe(true))
    await userEvent.keyboard('{Escape}')
    expect(details('필터').open).toBe(false)
  })

  it('패널 안을 눌러도 닫지 않는다', async () => {
    renderTwoDropdowns()

    await userEvent.click(screen.getByText('필터'))
    await waitFor(() => expect(details('필터').open).toBe(true))
    await userEvent.click(screen.getByText('필터 내용'))
    expect(details('필터').open).toBe(true)
  })
})
