import { FileText } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { AnswerSource } from '@/entities/answer'
import type { ChatMessage } from '../model/chatStore'

export function MessageList({
  messages,
  pending,
  onOpenSource,
}: {
  messages: ChatMessage[]
  pending: boolean
  onOpenSource: (source: AnswerSource) => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  // 메시지가 추가될 때만 맨 아래로 스크롤합니다.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length, pending])

  if (messages.length === 0 && !pending) {
    return (
      <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
        질문하면 사내 문서에서 근거를 찾아 답변합니다.
      </p>
    )
  }

  return (
    <ol className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-label="대화">
      {messages.map((message) => (
        <li key={message.id} className={message.kind === 'question' ? 'self-end' : 'self-start'}>
          {message.kind === 'question' && (
            <p className="max-w-80 rounded-lg bg-slate-900 px-3 py-2 text-sm whitespace-pre-wrap text-white">
              {message.text}
            </p>
          )}
          {message.kind === 'answer' && (
            <AnswerBubble text={message.text} sources={message.sources} onOpen={onOpenSource} />
          )}
          {message.kind === 'error' && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {message.text}
            </p>
          )}
        </li>
      ))}
      {pending && (
        <li className="self-start text-sm text-slate-500" role="status">
          답변을 만드는 중입니다. 최대 1분 정도 걸릴 수 있습니다.
        </li>
      )}
      <div ref={endRef} />
    </ol>
  )
}

function AnswerBubble({
  text,
  sources,
  onOpen,
}: {
  text: string
  sources: AnswerSource[]
  onOpen: (source: AnswerSource) => void
}) {
  return (
    <div className="flex max-w-96 flex-col gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm">
      <p className="whitespace-pre-wrap">{text}</p>
      {sources.length > 0 && (
        <ul aria-label="근거" className="flex flex-wrap gap-1">
          {sources.map((source, index) => (
            <li key={source.id}>
              <button
                type="button"
                onClick={() => onOpen(source)}
                className="flex max-w-60 items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs hover:border-slate-500"
              >
                <FileText className="size-3 shrink-0" aria-hidden />
                <span className="truncate">
                  [{index + 1}] {source.documentTitle}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
