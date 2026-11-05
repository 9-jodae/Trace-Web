import { FileText, Quote } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { AnswerEvidence, AnswerSource } from '@/entities/answer'
import type { ChatMessage } from '../model/chatStore'
import { AnswerMarkdown } from './AnswerMarkdown'

export function MessageList({
  messages,
  pending,
  onOpenSource,
  onRetryWithoutFilters,
  onRephrase,
}: {
  messages: ChatMessage[]
  pending: boolean
  onOpenSource: (source: AnswerSource) => void
  onRetryWithoutFilters: (questionText: string) => void
  onRephrase: (questionText: string) => void
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
      {messages.map((message, index) => {
        // 질문 바로 다음에 그 답변이 오므로, 재시도에 쓸 원래 질문 문장은 바로 앞 메시지입니다.
        const previous = messages[index - 1]
        const originalQuestion = previous?.kind === 'question' ? previous.text : ''
        return (
          <li key={message.id} className={message.kind === 'question' ? 'self-end' : 'self-start'}>
            {message.kind === 'question' && (
              <p className="max-w-80 rounded-2xl bg-[#262523] px-4 py-3 text-[15px] whitespace-pre-wrap text-ink">
                {message.text}
              </p>
            )}
            {message.kind === 'answer' && (
              <AnswerBubble
                text={message.text}
                sources={message.sources}
                evidence={message.evidence}
                missingSourceCount={message.missingSourceCount ?? 0}
                onOpen={onOpenSource}
                originalQuestion={originalQuestion}
                onRetryWithoutFilters={onRetryWithoutFilters}
                onRephrase={onRephrase}
              />
            )}
            {message.kind === 'error' && (
              <p role="alert" className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {message.text}
              </p>
            )}
          </li>
        )
      })}
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
  evidence,
  missingSourceCount,
  onOpen,
  originalQuestion,
  onRetryWithoutFilters,
  onRephrase,
}: {
  text: string
  sources: AnswerSource[]
  evidence: AnswerEvidence[]
  missingSourceCount: number
  onOpen: (source: AnswerSource) => void
  originalQuestion: string
  onRetryWithoutFilters: (questionText: string) => void
  onRephrase: (questionText: string) => void
}) {
  return (
    <div className="flex max-w-96 flex-col gap-3 text-[15px]">
      <AnswerMarkdown text={text} />
      {evidence.length > 0 && (
        <ul aria-label="핵심 인용" className="flex flex-col gap-1.5">
          {evidence.map((item) => (
            <li key={item.chunkId}>
              <button
                type="button"
                onClick={() =>
                  onOpen({
                    id: item.chunkId,
                    text: item.quote,
                    source: item.source,
                    documentId: item.documentId,
                    documentTitle: item.source,
                    versionId: item.versionId,
                    charStart: item.charStart,
                    charEnd: item.charEnd,
                  })
                }
                className="flex w-full items-start gap-2 rounded-[10px] border-l-2 border-ink-muted/40 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/5"
              >
                <Quote className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden />
                <span className="flex-1 text-sm text-ink-dim italic">
                  "{item.quote}" <span className="not-italic text-ink-muted">— {item.source}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
      {sources.length === 0 && missingSourceCount === 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onRetryWithoutFilters(originalQuestion)}
            disabled={!originalQuestion}
            className="rounded-full border border-border-dark-strong px-3 py-1.5 text-xs text-ink-dim hover:text-ink disabled:opacity-40"
          >
            필터 해제하고 다시 찾기
          </button>
          <button
            type="button"
            onClick={() => onRephrase(originalQuestion)}
            disabled={!originalQuestion}
            className="rounded-full border border-border-dark-strong px-3 py-1.5 text-xs text-ink-dim hover:text-ink disabled:opacity-40"
          >
            다른 표현으로 질문
          </button>
        </div>
      )}
      {missingSourceCount > 0 && (
        <p className="text-xs text-ink-muted">
          근거 {missingSourceCount}개는 문서가 개정·삭제되었거나 볼 권한이 없어 표시할 수 없습니다
        </p>
      )}
    </div>
  )
}
