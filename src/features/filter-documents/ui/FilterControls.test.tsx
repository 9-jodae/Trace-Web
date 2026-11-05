import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FilterDropdown, FilterDropdownGroup } from './FilterControls'

const toggle = (label: string) => screen.getByRole('button', { name: label })

function renderTwoDropdowns() {
  render(
    <>
      <FilterDropdownGroup>
        <FilterDropdown label="문서함" active={false}>
          <p>문서함 내용</p>
        </FilterDropdown>
        <FilterDropdown label="필터" active={false}>
          <p>필터 내용</p>
        </FilterDropdown>
      </FilterDropdownGroup>
      <button type="button">바깥</button>
    </>,
  )
}

describe('FilterDropdown', () => {
  it('다른 필터 버튼을 누르면 먼저 연 패널은 닫혀 두 패널이 겹치지 않는다', async () => {
    renderTwoDropdowns()

    await userEvent.click(toggle('문서함'))
    expect(toggle('문서함')).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(toggle('필터'))
    expect(toggle('필터')).toHaveAttribute('aria-expanded', 'true')
    expect(toggle('문서함')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('문서함 내용')).not.toBeInTheDocument()
  })

  it('패널 바깥을 누르거나 Esc를 누르면 닫는다', async () => {
    renderTwoDropdowns()

    await userEvent.click(toggle('필터'))
    await userEvent.click(screen.getByRole('button', { name: '바깥' }))
    expect(toggle('필터')).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(toggle('필터'))
    await userEvent.keyboard('{Escape}')
    expect(toggle('필터')).toHaveAttribute('aria-expanded', 'false')
  })

  it('패널 안을 눌러도 닫지 않는다', async () => {
    renderTwoDropdowns()

    await userEvent.click(toggle('필터'))
    await userEvent.click(screen.getByText('필터 내용'))
    expect(toggle('필터')).toHaveAttribute('aria-expanded', 'true')
  })

  it('아래 공간이 모자라고 위가 더 넓으면 위로 펼친다', async () => {
    const originalHeight = window.innerHeight
    window.innerHeight = 700
    const rect = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        top: 600,
        bottom: 640,
        left: 0,
        right: 0,
        width: 0,
        height: 40,
        x: 0,
        y: 600,
        toJSON: () => ({}),
      }
    }
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 400,
    })
    try {
      renderTwoDropdowns()
      await userEvent.click(toggle('필터'))
      const panel = screen.getByText('필터 내용').parentElement as HTMLElement
      expect(panel).toHaveClass('bottom-full')
      expect(panel).not.toHaveClass('invisible')
    } finally {
      window.innerHeight = originalHeight
      HTMLElement.prototype.getBoundingClientRect = rect
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight
    }
  })
})
