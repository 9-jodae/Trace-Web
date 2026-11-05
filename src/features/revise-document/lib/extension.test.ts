import { describe, expect, it } from 'vitest'
import { hasSameExtension } from './extension'

describe('hasSameExtension', () => {
  it('대소문자와 앞의 점을 무시하고 비교한다', () => {
    expect(hasSameExtension('출장비 v2.MD', 'md')).toBe(true)
    expect(hasSameExtension('a.pdf', '.PDF')).toBe(true)
    expect(hasSameExtension('a.pdf', 'md')).toBe(false)
    expect(hasSameExtension('README', 'md')).toBe(false)
  })
})
