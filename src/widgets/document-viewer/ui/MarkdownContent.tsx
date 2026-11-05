import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MARKDOWN_STALE_TIME = 10 * 60 * 1000

async function fetchMarkdownText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('MARKDOWN_FETCH_ERROR')
  return response.text()
}

export function MarkdownContent({
  documentId,
  url,
  attempt,
  onError,
}: {
  documentId: string
  url: string
  attempt: number
  onError: () => void
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ['document', 'markdown', documentId, url, attempt] as const,
    queryFn: () => fetchMarkdownText(url),
    staleTime: MARKDOWN_STALE_TIME,
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
