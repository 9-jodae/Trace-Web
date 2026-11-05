import type { AnswerSource, AskQuestionFilters } from '@/entities/answer'
import { useChatStore } from '../model/chatStore'
import { useAskQuestion } from '../model/useAskQuestion'
import { MessageList } from './MessageList'
import { QuestionInput } from './QuestionInput'

/**
 * 대화 목록과 질문 입력. 근거를 눌렀을 때의 동작은 호출하는 쪽에서 정합니다.
 * 검색 필터는 widget(features/filter-documents를 아는 쪽)이 변환해서 넘겨줍니다.
 */
export function ChatView({
  onOpenSource,
  filters,
}: {
  onOpenSource: (source: AnswerSource) => void
  filters?: AskQuestionFilters
}) {
  const messages = useChatStore((state) => state.messages)
  const { ask, isPending } = useAskQuestion()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList messages={messages} pending={isPending} onOpenSource={onOpenSource} />
      <QuestionInput onSubmit={(message) => ask(message, filters)} disabled={isPending} />
    </div>
  )
}
