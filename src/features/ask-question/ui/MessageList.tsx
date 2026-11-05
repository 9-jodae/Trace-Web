import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import {
  NO_EVIDENCE_ANSWER,
  type AnswerEditProposal,
  type AnswerEvidence,
  type AnswerKeyword,
  type AnswerSource,
} from '@/entities/answer'
import type { EvidencePhrases } from '@/entities/evidence'
import { buildEvidenceCards } from '../lib/evidenceCards'
import type { ChatMessage } from '../model/chatStore'
import { AnswerMarkdown } from './AnswerMarkdown'
import { EditProposalCard } from './EditProposalCard'
import { AssistantRow, MessageTime, TypingIndicator, assistantBubble } from './AssistantMessage'

const isAssistantSide = (message: ChatMessage | undefined) =>
  message?.kind === 'answer' || message?.kind === 'error'

export function MessageList({
  messages,
  pendingSince,
  onOpenSource,
  onRetryWithoutFilters,
  onRephrase,
}: {
  messages: ChatMessage[]
  /** 답변을 기다리는 중이면 질문을 보낸 시각(ms), 아니면 null */
  pendingSince: number | null
  onOpenSource: (source: AnswerSource, highlights?: EvidencePhrases) => void
  onRetryWithoutFilters: (questionText: string) => void
  onRephrase: (questionText: string) => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  // 메시지가 추가될 때만 맨 아래로 스크롤합니다.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length, pendingSince])

  if (messages.length === 0 && pendingSince === null) {
    return (
      <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-muted">
        질문하면 사내 문서에서 근거를 찾아 답변합니다.
      </p>
    )
  }

  return (
    <ol className="flex flex-1 flex-col gap-5 overflow-y-auto p-6" aria-label="대화">
      {messages.map((message, index) => {
        // 질문 바로 다음에 그 답변이 오므로, 재시도에 쓸 원래 질문 문장은 바로 앞 메시지입니다.
        const previous = messages[index - 1]
        const originalQuestion = previous?.kind === 'question' ? previous.text : ''
        // 상대 말풍선이 연달아 오면 첫 말풍선에만 프로필과 이름을 보여줍니다.
        const showProfile = !isAssistantSide(previous)
        return (
          <li key={message.id}>
            {message.kind === 'question' && (
              <div className="flex items-end justify-end gap-2">
                <MessageTime createdAt={message.createdAt} />
                <p className="max-w-80 rounded-[18px] rounded-tr-md bg-ink px-4 py-3 text-[15px] whitespace-pre-wrap text-[#141413]">
                  {message.text}
                </p>
              </div>
            )}
            {message.kind === 'answer' && (
              <AssistantRow showProfile={showProfile}>
                <AnswerBubble
                  text={message.text}
                  sources={message.sources}
                  evidence={message.evidence}
                  missingSourceCount={message.missingSourceCount ?? 0}
                  keywords={message.keywords}
                  editProposals={message.editProposals}
                  onOpen={onOpenSource}
                  originalQuestion={originalQuestion}
                  onRetryWithoutFilters={onRetryWithoutFilters}
                  onRephrase={onRephrase}
                />
                <MessageTime createdAt={message.createdAt} />
              </AssistantRow>
            )}
            {message.kind === 'error' && (
              <AssistantRow showProfile={showProfile}>
                <p
                  role="alert"
                  className={clsx(
                    assistantBubble,
                    'w-fit border-red-900/40 bg-red-950/40 text-sm text-red-300',
                  )}
                >
                  {message.text}
                </p>
                <MessageTime createdAt={message.createdAt} />
              </AssistantRow>
            )}
          </li>
        )
      })}
      {pendingSince !== null && (
        <li>
          <AssistantRow showProfile={!isAssistantSide(messages.at(-1))}>
            <TypingIndicator startedAt={pendingSince} />
          </AssistantRow>
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
  keywords = [],
  editProposals = [],
  onOpen,
  originalQuestion,
  onRetryWithoutFilters,
  onRephrase,
}: {
  text: string
  sources: AnswerSource[]
  evidence: AnswerEvidence[]
  missingSourceCount: number
  keywords?: AnswerKeyword[]
  editProposals?: AnswerEditProposal[]
  onOpen: (source: AnswerSource, highlights?: EvidencePhrases) => void
  originalQuestion: string
  onRetryWithoutFilters: (questionText: string) => void
  onRephrase: (questionText: string) => void
}) {
  // 문서를 열 때 그 문서에서 나온 인용과 키워드를 함께 넘깁니다. 인용은 누른 청크가 아니라 같은 문서의
  // 다른 청크에서 뽑혔을 수 있으므로 문서 단위로 모읍니다.
  const open = (source: AnswerSource) => {
    const documentChunkIds = new Set([
      ...sources.filter((item) => item.documentId === source.documentId).map((item) => item.id),
      ...evidence
        .filter((item) => item.documentId === source.documentId)
        .map((item) => item.chunkId),
    ])
    onOpen(source, {
      quotes: evidence
        .filter((item) => item.documentId === source.documentId)
        .map((item) => item.quote),
      keywords: keywords
        .filter((item) => documentChunkIds.has(item.chunkId))
        .map((item) => item.text),
    })
  }

  const cards = buildEvidenceCards(sources, evidence)

  return (
    <>
      <div
        className={clsx(
          assistantBubble,
          'flex flex-col gap-3 border-border-dark bg-[#1e1d1b] text-[15px]',
        )}
      >
        <AnswerMarkdown text={text} />
        {editProposals.length > 0 && (
          <div aria-label="수정 제안" className="flex flex-col gap-2">
            {editProposals.map((proposal) => (
              <EditProposalCard
                key={`${proposal.chunkId}:${proposal.before}`}
                proposal={{
                  ...proposal,
                  peerDocumentIds: [
                    ...new Set(
                      evidence
                        .map((item) => item.documentId)
                        .filter((id) => id !== proposal.documentId),
                    ),
                  ],
                }}
              />
            ))}
          </div>
        )}
        {cards.length > 0 && (
          <ul aria-label="근거" className="flex flex-col gap-2 border-t border-border-dark pt-3">
            {cards.map(({ source, section, quotes }, index) => (
              <li key={source.id}>
                <button
                  type="button"
                  onClick={() => open(source)}
                  className="flex w-full flex-col gap-2.5 rounded-xl border border-white/[0.04] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <span className="flex w-full items-baseline gap-3">
                    <span className="shrink-0 font-mono text-[13px] text-ink-dim">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {source.documentTitle}
                    </span>
                    {section && (
                      <span className="max-w-[45%] shrink-0 truncate text-xs text-ink-muted">
                        {section}
                      </span>
                    )}
                  </span>
                  {quotes.map((quote) => (
                    <span
                      key={quote}
                      className="block border-l-2 border-amber-500/70 pl-3 text-sm leading-relaxed text-ink-dim"
                    >
                      {quote}
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        )}
        {missingSourceCount > 0 && (
          <p className="text-xs text-ink-muted">
            근거 {missingSourceCount}개는 문서가 개정·삭제되었거나 볼 권한이 없어 표시할 수 없습니다
          </p>
        )}
      </div>
      {/* 인사 답변과 되묻는 문장에는 붙이지 않고 거절 문장에만 재시도 버튼을 보여 줍니다.
          임시 판별입니다. Trace-Server #82가 머지되면 answerType === 'NO_EVIDENCE'로 바꿉니다. */}
      {sources.length === 0 && missingSourceCount === 0 && text.trim() === NO_EVIDENCE_ANSWER && (
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
    </>
  )
}
