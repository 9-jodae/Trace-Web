import { splitByRange } from '@/shared/lib'

/** MD/DOCX 변환 텍스트용. PDF는 pdf-viewer.tsx(react-pdf)로 분리 예정 */
export function TextViewer({ text, highlight }: { text: string; highlight?: { start: number; end: number } }) {
  if (!highlight) return <pre style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>
  const [before, match, after] = splitByRange(text, highlight.start, highlight.end)
  return (
    <pre style={{ whiteSpace: 'pre-wrap' }}>
      {before}
      <mark ref={(el) => el?.scrollIntoView({ block: 'center' })}>{match}</mark>
      {after}
    </pre>
  )
}
