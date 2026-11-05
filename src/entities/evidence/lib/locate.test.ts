import { describe, expect, it } from 'vitest'
import { locateEvidence, normalizePhrase } from './locate'

function root(html: string) {
  const element = document.createElement('div')
  element.innerHTML = html
  return element
}

const texts = (ranges: Range[]) => ranges.map((range) => range.toString().replace(/\s+/g, ' '))

const RENDERED = `
  <h1>신규 직원 안내</h1>
  <h2>제1조 첫날</h2>
  <p>신규 직원은 인사팀 안내에 따라 계정을 만든다. 이월 한도는 7일이다.</p>
  <h2>제2조 연차</h2>
  <p>연차는 <strong>《취업규칙》</strong> 제12조를 기준으로 안내한다.
  공개 규칙의 이월 한도는 5일이다.</p>
  <h2>제3조 출장</h2>
  <p>숙박비 한도는 1박당 90,000원이다.</p>
`

const CHUNK =
  '## 제2조 연차\n\n연차는 **《취업규칙》** 제12조를 기준으로 안내한다. 공개 규칙의 이월 한도는 5일이다.'

describe('normalizePhrase', () => {
  it('글자와 숫자만 남기고 Markdown 링크 주소는 뺀다', () => {
    expect(normalizePhrase('## 제2조 **연차** [규정](a.md)')).toBe('제2조연차규정')
    expect(normalizePhrase('"1박당 90,000원"')).toBe('1박당90000원')
  })
})

describe('locateEvidence', () => {
  it('요소·줄바꿈·기호가 달라도 인용 위치를 찾는다', () => {
    const { highlights } = locateEvidence(root(RENDERED), {
      chunkText: CHUNK,
      phrases: { quotes: ['"취업규칙 제12조를 기준으로 안내한다. 공개 규칙의"'], keywords: [] },
    })
    expect(texts(highlights)).toEqual(['취업규칙》 제12조를 기준으로 안내한다. 공개 규칙의'])
  })

  it('인용은 누른 청크 밖에 있어도 칠한다', () => {
    const { highlights } = locateEvidence(root(RENDERED), {
      chunkText: CHUNK,
      phrases: { quotes: ['숙박비 한도는 1박당 90,000원이다.'], keywords: [] },
    })
    expect(texts(highlights)).toEqual(['숙박비 한도는 1박당 90,000원이다'])
  })

  it('키워드는 청크 구간 안의 것만 칠한다', () => {
    const { highlights } = locateEvidence(root(RENDERED), {
      chunkText: CHUNK,
      phrases: { quotes: [], keywords: ['이월 한도는'] },
    })
    expect(highlights).toHaveLength(1)
    expect(highlights[0]?.startContainer.parentElement?.textContent).toContain('5일이다')
  })

  it('칠할 문구가 없으면 청크 전체를 칠하지 않고 청크 위치만 알려준다', () => {
    const { highlights, chunk } = locateEvidence(root(RENDERED), {
      chunkText: CHUNK,
      phrases: { quotes: ['다른 문서의 인용'], keywords: [] },
    })
    expect(highlights).toEqual([])
    expect(texts(chunk ? [chunk] : [])[0]).toMatch(/^제2조 연차.*5일이다$/)
  })

  it('청크도 원문에 없으면 아무것도 찾지 못한다', () => {
    const location = locateEvidence(root(RENDERED), {
      chunkText: '전혀 다른 내용입니다',
      phrases: { quotes: ['없는 문구'], keywords: ['5일'] },
    })
    expect(location).toEqual({ highlights: [], chunk: null })
  })
})
