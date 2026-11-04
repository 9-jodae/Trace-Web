import { useState, type FormEvent } from 'react'

export function QuestionInput({ onSubmit, disabled }: { onSubmit: (q: string) => void; disabled?: boolean }) {
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) onSubmit(q.trim())
  }
  return (
    <form onSubmit={submit}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="사내 규정·매뉴얼에 대해 질문하세요" />
      <button type="submit" disabled={disabled}>질문</button>
    </form>
  )
}
