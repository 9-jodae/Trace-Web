import { ArrowUp } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useAskQuestion } from '@/features/ask-question'
import {
  FilterDropdownGroup,
  FilterPanel,
  SourceKindDropdown,
  toQuestionFilters,
  useDocumentFilterStore,
} from '@/features/filter-documents'
import { EXAMPLE_QUESTIONS } from '../lib/exampleQuestions'
import { useTypewriter } from '../lib/useTypewriter'
import background from './assets/background.svg'

/** 첫 질문을 하기 전의 홈 화면. 질문을 보내면 그래프+채팅 화면("02")으로 바뀝니다. */
export function HomeComposer() {
  const [question, setQuestion] = useState('')
  const { ask, isPending } = useAskQuestion()
  const filter = useDocumentFilterStore((state) => state.filter)
  // 입력이 비어 있는 동안 예시 질문을 한 글자씩 써 보여 줍니다. 움직임 줄이기 설정이면 첫 예시만 보여 줍니다
  const example = useTypewriter(EXAMPLE_QUESTIONS, question === '' && !prefersReducedMotion())

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
    <div className="relative flex size-full flex-col items-center justify-center gap-6 overflow-hidden bg-canvas p-10">
      <img
        src={background}
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      <div className="relative flex flex-col items-center gap-3.5 text-center">
        <p className="text-[38px] tracking-tight text-white">
          사내 문서에 <span className="font-semibold">물어보세요</span>.
        </p>
        <p className="text-[15px] text-ink-dim">답변마다 원문 근거를 함께 보여 드립니다.</p>
      </div>

      {/* 노트북(1280·1366px)에서도 잘리지 않도록 고정 폭 대신 최대 폭만 둡니다. */}
      <div className="relative flex w-full max-w-[760px] flex-col rounded-[20px] border border-border-dark-strong bg-surface-raised shadow-[0px_24px_60px_rgba(0,0,0,0.45)]">
        <div className="relative px-6 pt-5 pb-2">
          <textarea
            aria-label="질문"
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="무엇이든 물어보세요."
            className="relative z-10 w-full resize-none bg-transparent text-[16px] text-ink placeholder:text-transparent focus:outline-none"
          />
          {question === '' && (
            <p
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-5 bottom-2 flex items-center justify-center text-[16px] text-ink-muted"
            >
              {example}
              <span className="ml-0.5 inline-block h-[1.1em] w-px animate-pulse bg-ink-muted" />
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 pt-2 pb-3">
          <FilterDropdownGroup>
            <SourceKindDropdown />
            <FilterPanel />
          </FilterDropdownGroup>
          <div className="h-px flex-1" />
          <button
            type="button"
            aria-label="질문 보내기"
            disabled={isPending || !question.trim()}
            onClick={() => submit(question)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-[#111110] disabled:opacity-40"
          >
            <ArrowUp className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}
