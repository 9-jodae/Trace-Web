import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTabStore, useTabStore } from '../model/tabStore'
import { TabBar } from './TabBar'

describe('TabBar', () => {
  const scrollIntoView = vi.fn<(options?: ScrollIntoViewOptions) => void>()

  beforeEach(() => {
    resetTabStore()
    scrollIntoView.mockClear()
    // jsdom에는 scrollIntoView가 없어 호출만 기록합니다.
    Element.prototype.scrollIntoView = scrollIntoView
  })
  afterEach(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  it('새로 연 문서 탭을 탭 목록에서 보이는 위치로 스크롤한다', () => {
    render(<TabBar />)

    act(() => {
      useTabStore.getState().openDocument({ documentId: 'd1', title: '취업규칙' })
    })

    const tab = screen.getByRole('tab', { name: /취업규칙/ })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' })
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(tab)
  })

  it('긴 문서 제목은 줄이고 전체 제목을 툴팁으로 보여준다', () => {
    render(<TabBar />)
    const title = '아주 긴 문서 제목이 들어간 사내 규정 개정 안내 문서'

    act(() => {
      useTabStore.getState().openDocument({ documentId: 'd1', title })
    })

    expect(screen.getByRole('button', { name: title })).toHaveAttribute('title', title)
  })
})
