import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES } from '@/shared/config'
import { excludeReason } from './screen'

describe('excludeReason', () => {
  it('숨김 파일·폴더를 뺀다', () => {
    expect(excludeReason('.DS_Store.md', 10)).toBe('숨김 파일')
    expect(excludeReason('공통/.private/a.md', 10)).toBe('숨김 파일')
  })

  it('.obsidian/·.trash/ 안의 파일을 뺀다', () => {
    expect(excludeReason('.obsidian/workspace.md', 10)).toBe('Obsidian 설정·휴지통')
    expect(excludeReason('공통/.trash/a.md', 10)).toBe('Obsidian 설정·휴지통')
  })

  it('확장자는 대소문자를 무시하고 pdf·md만 받는다', () => {
    expect(excludeReason('a.PDF', 10)).toBeNull()
    expect(excludeReason('a.Md', 10)).toBeNull()
    expect(excludeReason('a.docx', 10)).toBe('지원하지 않는 형식')
    expect(excludeReason('README', 10)).toBe('지원하지 않는 형식')
  })

  it('20MB까지는 받고 넘으면 뺀다', () => {
    expect(excludeReason('a.pdf', MAX_FILE_BYTES)).toBeNull()
    expect(excludeReason('a.pdf', MAX_FILE_BYTES + 1)).toBe('20MB 초과')
  })

  it('0바이트 파일을 뺀다', () => {
    expect(excludeReason('a.md', 0)).toBe('빈 파일')
  })
})
