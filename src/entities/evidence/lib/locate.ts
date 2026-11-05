/**
 * 화면에 그려진 원문(Markdown 렌더 결과, PDF 텍스트 레이어)에서 근거 문구의 위치를 찾습니다.
 *
 * 근거 청크와 인용은 원본 텍스트(Markdown 기호·줄바꿈 포함)라 화면 글자와 그대로 맞지 않습니다. 그래서
 * 양쪽 모두 NFKC로 맞추고 글자와 숫자만 남겨 비교합니다. 공백, 문장부호, 따옴표, Markdown 기호, 표 구분선
 * 차이는 무시됩니다.
 */
import type { EvidencePhrases } from '../model/types'

/** 남긴 글자마다 원래 텍스트 노드와 그 안의 시작·끝 위치를 기억합니다. */
interface TextIndex {
  text: string
  nodes: Text[]
  starts: number[]
  ends: number[]
}

type Span = [number, number]

const KEEP = /[\p{L}\p{N}]/u

function normalizeChar(char: string): string {
  let kept = ''
  for (const part of char.normalize('NFKC').toLowerCase()) {
    if (KEEP.test(part)) kept += part
  }
  return kept
}

function indexText(root: Node): TextIndex {
  const index: TextIndex = { text: '', nodes: [], starts: [], ends: [] }
  const chars: string[] = []
  const walker = root.ownerDocument?.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  if (!walker) return index
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const textNode = node as Text
    let offset = 0
    for (const char of textNode.data) {
      for (const kept of normalizeChar(char)) {
        chars.push(kept)
        index.nodes.push(textNode)
        index.starts.push(offset)
        index.ends.push(offset + char.length)
      }
      offset += char.length
    }
  }
  index.text = chars.join('')
  return index
}

/** 비교용 문자열을 만듭니다. Markdown 링크는 주소를 빼고 글자만 남깁니다. */
export function normalizePhrase(text: string): string {
  return [...text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')].map(normalizeChar).join('')
}

function findAll(text: string, phrase: string): Span[] {
  const spans: Span[] = []
  if (!phrase) return spans
  for (let start = text.indexOf(phrase); start !== -1; start = text.indexOf(phrase, start + 1)) {
    spans.push([start, start + phrase.length])
  }
  return spans
}

/**
 * 청크의 줄을 순서대로 찾아 원문에서 청크가 놓인 구간을 구합니다. 일부 줄이 원문과 달라도(머리말, 쪽 번호 등)
 * 나머지 줄로 위치를 잡습니다. 너무 짧은 줄은 엉뚱한 곳과 맞을 수 있어 뺍니다.
 */
function locateChunk(text: string, content: string): Span | null {
  let first: number | undefined
  let last: number | undefined
  let position = 0
  for (const line of content.split('\n').map(normalizePhrase)) {
    if (line.length < 4) continue
    const start = text.indexOf(line, position)
    if (start === -1) continue
    first ??= start
    last = start + line.length
    position = last
  }
  return first === undefined || last === undefined ? null : [first, last]
}

function merge(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0])
  const merged: Span[] = []
  for (const span of sorted) {
    const last = merged.at(-1)
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1])
    else merged.push([span[0], span[1]])
  }
  return merged
}

function toRange(root: Node, index: TextIndex, [start, end]: Span): Range | null {
  const document = root.ownerDocument
  const startNode = index.nodes[start]
  const endNode = index.nodes[end - 1]
  if (!document || !startNode || !endNode) return null
  const range = document.createRange()
  range.setStart(startNode, index.starts[start] as number)
  range.setEnd(endNode, index.ends[end - 1] as number)
  return range
}

export interface EvidenceLocation {
  /** 칠할 범위(인용·키워드) */
  highlights: Range[]
  /** 근거 청크가 놓인 구간. 칠할 문구가 없을 때 이 위치로 이동합니다. */
  chunk: Range | null
}

/**
 * 원문에서 칠할 범위와 근거 청크 위치를 구합니다.
 * - 인용은 문서 어디에 있든 칠합니다.
 * - 키워드는 근거 청크 구간 안에 있는 것만 칠합니다. 청크 위치를 못 찾으면 키워드는 칠하지 않습니다.
 * - 청크 전체는 칠하지 않습니다. 칠할 문구가 없으면 `chunk`로 위치만 알려줍니다.
 */
export function locateEvidence(
  root: Node,
  { chunkText, phrases }: { chunkText: string; phrases: EvidencePhrases },
): EvidenceLocation {
  const index = indexText(root)
  const region = locateChunk(index.text, chunkText)

  const quoteSpans = phrases.quotes.flatMap((quote) => findAll(index.text, normalizePhrase(quote)))
  const keywordSpans = region
    ? phrases.keywords
        .flatMap((keyword) => findAll(index.text, normalizePhrase(keyword)))
        .filter(([start, end]) => start >= region[0] && end <= region[1])
    : []

  return {
    highlights: merge([...quoteSpans, ...keywordSpans])
      .map((span) => toRange(root, index, span))
      .filter((range): range is Range => range !== null),
    chunk: region ? toRange(root, index, region) : null,
  }
}
