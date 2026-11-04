/** 원문 텍스트를 [before, match, after]로 쪼갠다 (근거 하이라이트용) */
export function splitByRange(text: string, start: number, end: number) {
  return [text.slice(0, start), text.slice(start, end), text.slice(end)] as const
}
