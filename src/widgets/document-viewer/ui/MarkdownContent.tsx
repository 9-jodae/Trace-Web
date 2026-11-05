import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * 미리 받은 Markdown 파일을 글자로 풀어 보여줍니다. 같은 문서·버전의 파일은 내용이 같으므로
 * 문서 ID와 버전으로 캐시합니다.
 */
export function MarkdownContent({
  documentId,
  version,
  file,
  onError,
}: {
  documentId: string
  version: number
  file: Blob
  onError: () => void
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ['document', 'markdown', documentId, version] as const,
    queryFn: () => file.text(),
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (error) onError()
  }, [error, onError])

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-ink-muted">
        원문을 불러오는 중…
      </div>
    )
  }

  if (error || data === undefined) return null

  return (
    <article className="prose prose-sm prose-invert max-w-none p-6 leading-relaxed">
      <Markdown remarkPlugins={[remarkGfm]}>{data}</Markdown>
    </article>
  )
}
