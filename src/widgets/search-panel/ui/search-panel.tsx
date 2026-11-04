import { useAskQuestion, QuestionInput } from '@/features/ask-question'
import { FilterControls, useSearchFilter } from '@/features/filter-documents'
import { AnswerView } from './answer-view'

export function SearchPanel() {
  const filter = useSearchFilter((s) => s.filter)
  const { answer, loading, ask } = useAskQuestion()
  return (
    <section>
      <FilterControls />
      <QuestionInput disabled={loading} onSubmit={(q) => ask(q, filter)} />
      {answer && <AnswerView answer={answer} />}
    </section>
  )
}
