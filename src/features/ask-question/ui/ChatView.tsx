import { useRef, useState } from 'react'
import type { AnswerSource, AskQuestionFilters } from '@/entities/answer'
import type { EvidencePhrases } from '@/entities/evidence'
import { useChatStore } from '../model/chatStore'
import { useAskQuestion, usePendingQuestionSince } from '../model/useAskQuestion'
import { MessageList } from './MessageList'
import { QuestionInput } from './QuestionInput'

/**
 * 대화 목록과 질문 입력. 근거를 눌렀을 때의 동작은 호출하는 쪽에서 정합니다.
 * 검색 필터는 widget(features/filter-documents를 아는 쪽)이 변환해서 넘겨주고,
 * "필터 해제하고 다시 찾기"를 누르면 widget이 준 onClearFilters로 필터 자체도 지웁니다.
 */
export function ChatView({
  onOpenSource,
  filters,
  onClearFilters,
}: {
  onOpenSource: (source: AnswerSource, highlights?: EvidencePhrases) => void
  filters?: AskQuestionFilters
  onClearFilters?: () => void
}) {
  const messages = useChatStore((state) => state.messages)
  const { ask } = useAskQuestion()
  // 다른 화면에서 보낸 질문도 기다리는 중으로 보이도록, 이 컴포넌트의 요청만이 아니라
  // 지금 대화에서 진행 중인 질문 요청 전체를 봅니다.
  const pendingSince = usePendingQuestionSince()
  const isPending = pendingSince !== null
  const [question, setQuestion] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList
        messages={messages}
        pendingSince={pendingSince}
        onOpenSource={onOpenSource}
        onRetryWithoutFilters={(text) => {
          onClearFilters?.()
          ask(text)
        }}
        onRephrase={(text) => {
          setQuestion(text)
          inputRef.current?.focus()
        }}
      />
      <QuestionInput
        ref={inputRef}
        value={question}
        onChange={setQuestion}
        onSubmit={(text) => {
          ask(text, filters)
          setQuestion('')
        }}
        disabled={isPending}
      />
    </div>
  )
}
