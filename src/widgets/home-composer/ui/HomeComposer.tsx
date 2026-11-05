import { ArrowUp } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { GraphHighlightToggle, useAskQuestion } from '@/features/ask-question'
import {
  FilterPanel,
  SourceKindDropdown,
  toQuestionFilters,
  useDocumentFilterStore,
} from '@/features/filter-documents'
import background from './assets/background.svg'

const SUGGESTIONS = [
  '해외 출장 숙박비 한도는?',
  '법인카드 정산 순서',
  '9월 경영지원 회의 결정 사항',
]

/** 첫 질문을 하기 전의 홈 화면. 질문을 보내면 그래프+채팅 화면("02")으로 바뀝니다. */
export function HomeComposer() {
  const [question, setQuestion] = useState('')
  const { ask, isPending } = useAskQuestion()
  const filter = useDocumentFilterStore((state) => state.filter)

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    ask(trimmed, toQuestionFilters(filter))
    setQuestion('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit(question)
    }
  }

  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-7 overflow-hidden bg-canvas p-10">
      <img
        src={background}
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      <div className="relative flex flex-col items-center gap-3.5 text-center">
        <p className="text-[48px] tracking-tight text-white">
          사내 문서에 <span className="font-semibold">물어보세요</span>.
        </p>
        <p className="text-[17px] text-ink-dim">답변마다 원문 근거를 함께 보여 드립니다.</p>
      </div>

      <div className="relative flex w-[1040px] flex-col rounded-[22px] border border-border-dark-strong bg-surface-raised shadow-[0px_24px_60px_rgba(0,0,0,0.45)]">
        <div className="px-7 pt-6.5 pb-2.5">
          <textarea
            aria-label="질문"
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="무엇이든 물어보세요. 예: 해외 출장 숙박비 한도는 직급별로 얼마인가요?"
            className="w-full resize-none bg-transparent text-[18px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-3.5">
          <SourceKindDropdown />
          <FilterPanel />
          <div className="h-px flex-1" />
          <GraphHighlightToggle />
          <button
            type="button"
            aria-label="질문 보내기"
            disabled={isPending || !question.trim()}
            onClick={() => submit(question)}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-[#111110] disabled:opacity-40"
          >
            <ArrowUp className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative flex w-[1040px] justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={isPending}
            onClick={() => submit(suggestion)}
            className="flex h-11 items-center rounded-[22px] border border-border-dark-strong bg-panel px-[18px] text-sm text-ink-dim hover:text-ink disabled:opacity-40"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
