import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * 미리 받은 Markdown 파일을 글자로 풀어 보여줍니다. 파일 자체는 쿼리 캐시에 있으므로 글자는 따로
 * 캐시하지 않고, 부모가 새 파일마다 key를 바꿔 다시 풉니다.
 * 다 그리면 `onRendered`로 알려 부모가 원문 안 근거를 칠하게 합니다.
 */
export function MarkdownContent({
  file,
  onError,
  onRendered,
}: {
  file: Blob
  onError: () => void
  onRendered?: (complete: boolean) => void
}) {
  const [text, setText] = useState<string | null>(null)
  const onErrorRef = useRef(onError)
  const onRenderedRef = useRef(onRendered)

  useEffect(() => {
    onErrorRef.current = onError
    onRenderedRef.current = onRendered
  }, [onError, onRendered])

  useEffect(() => {
    if (text !== null) onRenderedRef.current?.(true)
  }, [text])

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
    <article className="prose prose-sm prose-invert max-w-none p-6 leading-relaxed">
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </article>
  )
}
