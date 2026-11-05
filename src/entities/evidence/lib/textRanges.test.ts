import { describe, expect, it } from 'vitest'
import { findTextRanges, normalizeForMatch } from './textRanges'

function render(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('normalizeForMatch', () => {
  it('공백과 Markdown 기호를 뺀다', () => {
    expect(normalizeForMatch('**연차**는\n  최대 `5일`')).toBe('연차는최대5일')
  })
})

describe('findTextRanges', () => {
  it('여러 요소에 걸친 인용 문구를 하나의 범위로 찾는다', () => {
    const root = render('<p>연차는 <strong>다음 해로</strong> 최대 5일까지 이월할 수 있다.</p>')
    const ranges = findTextRanges(root, ['다음 해로 최대 5일까지'])
    expect(ranges).toHaveLength(1)
    expect(ranges[0]?.toString()).toBe('다음 해로 최대 5일까지')
  })

  it('원문 Markdown 문법이 섞인 인용도 화면 글자에서 찾는다', () => {
    const root = render(
      '<h2>휴가 규정</h2><ul><li>연차는 <a href="#">인사팀</a>에 신청한다</li></ul>',
    )
    const ranges = findTextRanges(root, [
      '## 휴가 규정\n- 연차는 [인사팀](https://x.test)에 신청한다',
    ])
    expect(ranges.map((range) => range.toString())).toEqual(['휴가 규정연차는 인사팀에 신청한다'])
  })

  it('PDF 텍스트 레이어처럼 줄 단위로 나뉘고 띄어쓰기가 달라도 찾는다', () => {
    const root = render('<span>보안 등급이 CONFI</span><br><span>DENTIAL인 문서는</span>')
    const ranges = findTextRanges(root, ['보안등급이 CONFIDENTIAL 인 문서는'])
    expect(ranges).toHaveLength(1)
    expect(ranges[0]?.toString()).toBe('보안 등급이 CONFIDENTIAL인 문서는')
  })

  it('같은 문구가 여러 번 있으면 모두 찾는다', () => {
    const root = render('<p>승인 필요. 다시 승인 필요.</p>')
    expect(findTextRanges(root, ['승인 필요'])).toHaveLength(2)
  })

  it('원문에 없거나 너무 짧은 문구는 무시한다', () => {
    const root = render('<p>연차 규정</p>')
    expect(findTextRanges(root, ['없는 문구', '연', '  '])).toEqual([])
  })
})
