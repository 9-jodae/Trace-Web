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

export interface HighlightSegment {
  text: string
  marked: boolean
}

/**
 * 청크에서 핵심 문장과 키워드가 있는 부분만 표시합니다. 같은 문구가 여러 번 있으면 모두 표시하고
 * 겹치는 범위는 하나로 합칩니다. 원문에 없는 문구는 무시합니다.
 */
export function splitHighlights(content: string, phrases: string[]): HighlightSegment[] {
  const ranges: [number, number][] = []
  for (const phrase of phrases) {
    if (!phrase) continue
    for (
      let start = content.indexOf(phrase);
      start !== -1;
      start = content.indexOf(phrase, start + phrase.length)
    ) {
      ranges.push([start, start + phrase.length])
    }
  }
  ranges.sort((a, b) => a[0] - b[0])

  const segments: HighlightSegment[] = []
  let position = 0
  let index = 0
  while (index < ranges.length) {
    const [start] = ranges[index] as [number, number]
    let end = (ranges[index] as [number, number])[1]
    index += 1
    while (index < ranges.length && (ranges[index] as [number, number])[0] <= end) {
      end = Math.max(end, (ranges[index] as [number, number])[1])
      index += 1
    }
    if (start > position) segments.push({ text: content.substring(position, start), marked: false })
    segments.push({ text: content.substring(start, end), marked: true })
    position = end
  }
  if (position < content.length) segments.push({ text: content.substring(position), marked: false })
  return segments
}
