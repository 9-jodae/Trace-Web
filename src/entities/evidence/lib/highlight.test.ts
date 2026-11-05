import { describe, expect, it } from 'vitest'
import { splitHighlight } from './highlight'

describe('splitHighlight', () => {
  it('정상 범위면 앞·강조·뒤 텍스트로 나눈다', () => {
    const content = '연차는 다음 해로 최대 5일까지 이월할 수 있다.'
    expect(splitHighlight(content, 10, 17)).toEqual({
      before: '연차는 다음 해로 ',
      mark: '최대 5일까지',
      after: ' 이월할 수 있다.',
    })
  })

  it('charStart나 charEnd가 null이면 청크 전체를 강조한다', () => {
    const content = '전체 청크 강조'
    expect(splitHighlight(content, null, 4)).toEqual({
      before: '',
      mark: content,
      after: '',
    })
    expect(splitHighlight(content, 0, null)).toEqual({
      before: '',
      mark: content,
      after: '',
    })
    expect(splitHighlight(content, null, null)).toEqual({
      before: '',
      mark: content,
      after: '',
    })
  })

  it('범위를 벗어나면 청크 전체를 강조한다', () => {
    const content = '0123456789'
    expect(splitHighlight(content, -1, 5)).toEqual({
      before: '',
      mark: content,
      after: '',
    })
    expect(splitHighlight(content, 0, 11)).toEqual({
      before: '',
      mark: content,
      after: '',
    })
    expect(splitHighlight(content, 6, 3)).toEqual({
      before: '',
      mark: content,
      after: '',
    })
  })

  it('시작과 끝이 같은 빈 범위면 청크 전체를 강조한다', () => {
    const content = '빈 범위 테스트'
    expect(splitHighlight(content, 3, 3)).toEqual({
      before: '',
      mark: content,
      after: '',
    })
  })

  it('한글과 이모지가 섞인 텍스트를 UTF-16 인덱스로 정확히 자른다', () => {
    // '😀'는 UTF-16 코드 유닛 2개 길이입니다.
    const content = '안😀녕하세요 반갑습니다'
    const start = '안😀'.length // 3
    const end = '안😀녕하세요'.length // 7
    expect(splitHighlight(content, start, end)).toEqual({
      before: '안😀',
      mark: '녕하세요',
      after: ' 반갑습니다',
    })
  })
})
