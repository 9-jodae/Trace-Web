import { SendHorizontal } from 'lucide-react'
import { forwardRef, type FormEvent, type KeyboardEvent } from 'react'

export const QuestionInput = forwardRef<
  HTMLTextAreaElement,
  {
    value: string
    onChange: (value: string) => void
    onSubmit: (question: string) => void
    disabled: boolean
  }
>(function QuestionInput({ value, onChange, onSubmit, disabled }, ref) {
  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
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
          ref={ref}
          aria-label="질문"
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="질문 입력"
          className="min-h-10 flex-1 resize-none bg-transparent py-3 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label="질문 보내기"
          disabled={disabled || !value.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-[#111110] disabled:opacity-40"
        >
          <SendHorizontal className="size-[18px]" aria-hidden />
        </button>
      </div>
    </form>
  )
})
