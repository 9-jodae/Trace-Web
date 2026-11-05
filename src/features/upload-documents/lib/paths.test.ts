import { describe, expect, it } from 'vitest'
import { normalizePath, toSourcePath } from './paths'

describe('toSourcePath', () => {
  it('폴더에서 고른 파일은 맨 앞 폴더명을 뗀다', () => {
    expect(toSourcePath('vault/공통/규정/출장비.md', true)).toBe('공통/규정/출장비.md')
    expect(toSourcePath('/vault/a.md', true)).toBe('a.md')
  })

  it('파일로 고른 파일은 파일명만 쓴다', () => {
    expect(toSourcePath('출장비.md', false)).toBe('출장비.md')
    expect(toSourcePath('/dropped/출장비.md', false)).toBe('출장비.md')
  })

  it('역슬래시를 /로 바꾸고 앞의 /를 뗀다', () => {
    expect(normalizePath('\\\\vault\\공통\\a.md')).toBe('vault/공통/a.md')
    expect(toSourcePath('vault\\공통\\a.md', true)).toBe('공통/a.md')
  })

  it('대소문자와 유니코드 정규화는 바꾸지 않는다', () => {
    const nfd = '출장비.md'.normalize('NFD')
    expect(toSourcePath(`Vault/${nfd}`, true)).toBe(nfd)
    expect(toSourcePath('Vault/A.MD', true)).toBe('A.MD')
  })
})
