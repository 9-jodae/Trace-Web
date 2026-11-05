import { useRef, useState } from 'react'
import type { AnswerSource, AskQuestionFilters } from '@/entities/answer'
import { useChatStore } from '../model/chatStore'
import { useAskQuestion } from '../model/useAskQuestion'
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
  onOpenSource: (source: AnswerSource) => void
  filters?: AskQuestionFilters
  onClearFilters?: () => void
}) {
  const messages = useChatStore((state) => state.messages)
  const { ask, isPending } = useAskQuestion()
  const [question, setQuestion] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList
        messages={messages}
        pending={isPending}
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
