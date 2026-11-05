import type { AnswerSource } from '@/entities/answer'
import { useChatStore } from '../model/chatStore'
import { useAskQuestion, useIsAsking } from '../model/useAskQuestion'
import { MessageList } from './MessageList'
import { QuestionInput } from './QuestionInput'

/** 대화 목록과 질문 입력. 근거를 눌렀을 때의 동작은 호출하는 쪽에서 정합니다. */
export function ChatView({ onOpenSource }: { onOpenSource: (source: AnswerSource) => void }) {
  const messages = useChatStore((state) => state.messages)
  const { ask, isPending } = useAskQuestion()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList messages={messages} pending={isPending} onOpenSource={onOpenSource} />
      <QuestionInput onSubmit={ask} disabled={isPending} />
    </div>
  )
}

/** 답변을 기다리는 동안에는 새 대화를 시작할 수 없습니다(늦게 온 답변이 섞이지 않도록). */
export function NewConversationButton() {
  const asking = useIsAsking()
  const startNewConversation = useChatStore((state) => state.startNewConversation)
  const hasMessages = useChatStore((state) => state.messages.length > 0)
  return (
    <button
      type="button"
      onClick={startNewConversation}
      disabled={asking || !hasMessages}
      className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
    >
      새 대화
    </button>
  )
}
