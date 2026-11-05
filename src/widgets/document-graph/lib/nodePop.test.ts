import { describe, expect, it } from 'vitest'
import { POP_MS, POP_SPREAD_MS, popDelay, popScale } from './nodePop'

describe('nodePop', () => {
  it('노드마다 지연이 다르고 같은 노드는 늘 같다', () => {
    expect(popDelay('a')).toBe(popDelay('a'))
    expect(new Set(['a', 'b', 'c', 'd'].map(popDelay)).size).toBeGreaterThan(1)
    expect(popDelay('문서-123')).toBeLessThan(POP_SPREAD_MS)
  })

  it('지연 전에는 숨고, 잠깐 커졌다가 제 크기로 끝난다', () => {
    expect(popScale(100, 200)).toBe(0)
    expect(popScale(200 + POP_MS * 0.7, 200)).toBeGreaterThan(1)
    expect(popScale(200 + POP_MS, 200)).toBe(1)
  })
})
