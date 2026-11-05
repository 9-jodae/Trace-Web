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
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 p-3">
      <textarea
        aria-label="질문"
        rows={2}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="사내 규정·매뉴얼에 대해 질문하세요"
        className="min-h-10 flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        aria-label="질문 보내기"
        disabled={disabled || !question.trim()}
        className="rounded-md bg-slate-900 p-2 text-white disabled:opacity-40"
      >
        <SendHorizontal className="size-4" aria-hidden />
      </button>
    </form>
  )
}
