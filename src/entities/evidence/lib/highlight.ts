export interface HighlightParts {
  before: string
  mark: string
  after: string
}

/**
 * 청크 텍스트를 하이라이트 앞·강조·뒤 세 부분으로 나눕니다.
 * JS 문자열 인덱스(UTF-16) 기준이며, 위치가 없거나 범위를 벗어나면 청크 전체를 강조합니다.
 */
export function splitHighlight(
  content: string,
  charStart: number | null,
  charEnd: number | null,
): HighlightParts {
  if (
    charStart === null ||
    charEnd === null ||
    !Number.isInteger(charStart) ||
    !Number.isInteger(charEnd) ||
    charStart < 0 ||
    charStart >= charEnd ||
    charEnd > content.length
  ) {
    return { before: '', mark: content, after: '' }
  }

  return {
    before: content.substring(0, charStart),
    mark: content.substring(charStart, charEnd),
    after: content.substring(charEnd),
  }
}
