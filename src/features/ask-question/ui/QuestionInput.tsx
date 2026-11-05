import { SendHorizontal } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

export function QuestionInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (question: string) => void
  disabled: boolean
}) {
  const [question, setQuestion] = useState('')

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setQuestion('')
  }

  // Enter로 보내고, Shift+Enter로 줄을 바꿉니다. 한글 조합 중에는 보내지 않습니다.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} className="p-6 pt-0">
      <div className="flex items-end gap-2 rounded-2xl border border-border-dark-strong bg-surface-raised py-2 pr-2 pl-[18px]">
        <textarea
          aria-label="질문"
          rows={1}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="질문 입력"
          className="min-h-10 flex-1 resize-none bg-transparent py-3 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label="질문 보내기"
          disabled={disabled || !question.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-[#111110] disabled:opacity-40"
        >
          <SendHorizontal className="size-[18px]" aria-hidden />
        </button>
      </div>
    </form>
  )
}
