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
      <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-muted">
        질문하면 사내 문서에서 근거를 찾아 답변합니다.
      </p>
    )
  }

  return (
    <ol className="flex flex-1 flex-col gap-4 overflow-y-auto p-6" aria-label="대화">
      {messages.map((message) => (
        <li key={message.id} className={message.kind === 'question' ? 'self-end' : 'self-start'}>
          {message.kind === 'question' && (
            <p className="max-w-80 rounded-2xl bg-[#262523] px-4 py-3 text-[15px] whitespace-pre-wrap text-ink">
              {message.text}
            </p>
          )}
          {message.kind === 'answer' && (
            <AnswerBubble text={message.text} sources={message.sources} onOpen={onOpenSource} />
          )}
          {message.kind === 'error' && (
            <p role="alert" className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {message.text}
            </p>
          )}
        </li>
      ))}
      {pending && (
        <li className="self-start text-sm text-ink-muted" role="status">
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
    <div className="flex max-w-96 flex-col gap-3 text-[15px]">
      <p className="whitespace-pre-wrap text-[#e8e6e1]">{text}</p>
      {sources.length > 0 && (
        <ul aria-label="근거" className="flex flex-col gap-1 border-t border-border-dark pt-2">
          {sources.map((source, index) => (
            <li key={source.id}>
              <button
                type="button"
                onClick={() => onOpen(source)}
                className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left hover:bg-white/5"
              >
                <span className="w-4 shrink-0 font-mono text-[13px] text-ink-dim">{index + 1}</span>
                <FileText className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                <span className="flex-1 truncate text-sm text-ink">{source.documentTitle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
