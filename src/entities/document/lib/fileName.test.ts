import { describe, expect, it } from 'vitest'
import { documentFileName } from './fileName'

describe('documentFileName', () => {
  it('상대 경로의 마지막 부분(원래 파일 이름)을 쓴다', () => {
    expect(
      documentFileName({
        relativePath: '인사/규정/연차 규정.pdf',
        title: '연차',
        extension: 'pdf',
      }),
    ).toBe('연차 규정.pdf')
  })

  it('경로가 비어 있으면 제목과 확장자로 만든다', () => {
    expect(documentFileName({ relativePath: '', title: '취업규칙', extension: '.md' })).toBe(
      '취업규칙.md',
    )
    expect(documentFileName({ relativePath: '', title: '취업규칙', extension: '' })).toBe(
      '취업규칙',
    )
  })
})
