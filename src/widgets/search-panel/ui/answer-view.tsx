import type { Answer } from '@/entities/answer'
import { CitationChip } from '@/entities/citation'

export function AnswerView({ answer }: { answer: Answer }) {
  if (answer.status !== 'answered') {
    return <p role="status">{answer.message}</p>
  }
  const indexOf = (id: string) => answer.citations.findIndex((c) => c.id === id)
  return (
    <div>
      {answer.sentences.map((s, i) => (
        <span key={i}>
          {s.text}{' '}
          {s.citationIds.map((id) => {
            const c = answer.citations[indexOf(id)]
            return c ? <CitationChip key={id} citation={c} index={indexOf(id)} /> : null
          })}{' '}
        </span>
      ))}
    </div>
  )
}
