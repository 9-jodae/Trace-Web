/**
 * 화면에 그려진 원문(Markdown 본문, PDF 텍스트 레이어)에서 인용 문구가 있는 위치를 찾습니다.
 *
 * 인용 문구는 AI가 원문 파일에서 그대로 뽑은 것이라 화면 글자와 조금 다릅니다.
 * - Markdown: `**굵게**`, `# 제목`, `[글자](주소)` 같은 문법 기호가 화면에는 없습니다.
 * - PDF: pdf.js가 뽑은 글자와 AI가 파싱한 글자의 줄바꿈·띄어쓰기가 다릅니다.
 * 그래서 양쪽 모두 공백과 Markdown 기호를 빼고 비교한 뒤, 찾은 위치를 화면 글자 위치로 되돌립니다.
 * 문자열 인덱스는 양쪽 모두 JS(UTF-16) 기준이라 서버 오프셋의 코드 포인트 변환 문제가 없습니다.
 */

/** 비교할 때 무시하는 글자: 공백과 화면에 그려지지 않는 Markdown 기호. */
const IGNORED = /[\s*_`#>|~­​]/

/** 이보다 짧은 문구는 엉뚱한 곳에 많이 걸려 표시하지 않습니다. */
const MIN_PHRASE_LENGTH = 2

/** 인용 문구에서 화면에 그려지지 않는 Markdown 문법(링크 주소, 이미지 표시, 목록 기호)을 뺍니다. */
function stripMarkdownSyntax(phrase: string): string {
  return phrase
    .replace(/!\[/g, '[')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[[\]]/g, '')
    .replace(/^\s*(?:[-+]|\d+\.)\s+/gm, '')
}

export function normalizeForMatch(text: string): string {
  let result = ''
  for (const char of text) if (!IGNORED.test(char)) result += char
  return result
}

/**
 * root 아래 글자에서 phrases가 나오는 모든 위치를 Range로 돌려줍니다. 원문에 없는 문구는 건너뜁니다.
 * 한 문구가 여러 요소(굵은 글씨, PDF의 줄 단위 span)에 걸쳐 있어도 하나의 Range로 잡습니다.
 */
export function findTextRanges(root: Node, phrases: string[]): Range[] {
  const needles = [
    ...new Set(phrases.map((phrase) => normalizeForMatch(stripMarkdownSyntax(phrase)))),
  ].filter((needle) => needle.length >= MIN_PHRASE_LENGTH)
  if (needles.length === 0) return []

  // 비교용 글자 하나하나가 어느 텍스트 노드의 몇 번째 글자인지 기록합니다.
  const nodes: Text[] = []
  const nodeIndexes: number[] = []
  const offsets: number[] = []
  let haystack = ''
  const walker = (root.ownerDocument ?? document).createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    const value = text.data
    nodes.push(text)
    for (let offset = 0; offset < value.length; offset += 1) {
      const char = value[offset] as string
      if (IGNORED.test(char)) continue
      haystack += char
      nodeIndexes.push(nodes.length - 1)
      offsets.push(offset)
    }
  }

  const ranges: Range[] = []
  for (const needle of needles) {
    for (
      let start = haystack.indexOf(needle);
      start !== -1;
      start = haystack.indexOf(needle, start + needle.length)
    ) {
      const end = start + needle.length - 1
      const range = (root.ownerDocument ?? document).createRange()
      range.setStart(nodes[nodeIndexes[start] as number] as Text, offsets[start] as number)
      range.setEnd(nodes[nodeIndexes[end] as number] as Text, (offsets[end] as number) + 1)
      ranges.push(range)
    }
  }
  return ranges
}
