import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTypewriter } from './useTypewriter'

describe('useTypewriter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('한 글자씩 썼다가 지우고 다음 문장으로 넘어간다', () => {
    const { result } = renderHook(() => useTypewriter(['가나', '다'], true))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(70))
    expect(result.current).toBe('가')
    act(() => vi.advanceTimersByTime(70))
    expect(result.current).toBe('가나')
    // 다 쓴 문장을 잠시 보여 준 뒤 지운다. 타이머는 글자마다 다시 걸리므로 한 단계씩 진행한다
    for (const ms of [1600, 30, 30]) act(() => vi.advanceTimersByTime(ms))
    expect(result.current).toBe('')
    for (const ms of [400, 70]) act(() => vi.advanceTimersByTime(ms))
    expect(result.current).toBe('다')
  })

  it('멈추면 첫 문장을 그대로 보여 준다', () => {
    const { result } = renderHook(() => useTypewriter(['가나', '다'], false))
    expect(result.current).toBe('가나')
  })
})
