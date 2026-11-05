import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQuoteHighlight } from '../lib/useQuoteHighlight'

/**
 * 미리 받은 Markdown 파일을 글자로 풀어 보여줍니다. 파일 자체는 쿼리 캐시에 있으므로 글자는 따로
 * 캐시하지 않고, 부모가 새 파일마다 key를 바꿔 다시 풉니다.
 */
export function MarkdownContent({
  file,
  quotes,
  onError,
}: {
  file: Blob
  /** 원문에서 칠할 인용 문구(가장 최근 답변). */
  quotes: string[]
  onError: () => void
}) {
  const [text, setText] = useState<string | null>(null)
  const onErrorRef = useRef(onError)
  const { rootRef, apply } = useQuoteHighlight<HTMLElement>(quotes)

  // 본문을 다 그린 뒤 인용 위치를 찾습니다.
  useEffect(() => {
    if (text !== null) apply()
  }, [text, apply])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    const controller = new AbortController()
    file.text().then(
      (value) => {
        if (!controller.signal.aborted) setText(value)
      },
      () => {
        if (!controller.signal.aborted) onErrorRef.current()
      },
    )
    return () => controller.abort()
  }, [file])

  if (text === null) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-ink-muted">
        원문을 불러오는 중…
      </div>
    )
  }

  return (
    <article ref={rootRef} className="prose prose-sm prose-invert max-w-none p-6 leading-relaxed">
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </article>
  )
}
