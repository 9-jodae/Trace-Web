import { describe, expect, it } from 'vitest'
import { formatDateTime, formatFileSize } from './format'

describe('formatFileSize', () => {
  it('1MB 미만은 KB, 이상은 MB로 표시한다', () => {
    expect(formatFileSize(100)).toBe('1 KB')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('formatDateTime', () => {
  it('값이 없으면 대시를 쓴다', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})
