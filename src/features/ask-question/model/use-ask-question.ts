import { useState } from 'react'
import { streamEvents } from '@/shared/api'
import type { Answer } from '@/entities/answer'

/** filter는 같은 레이어(features)를 import하지 않도록 호출하는 쪽(widget)에서 주입 */
export function useAskQuestion() {
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [loading, setLoading] = useState(false)

  const ask = async (question: string, filter: unknown) => {
    setLoading(true)
    setAnswer(null)
    try {
      for await (const event of streamEvents('/ask', { question, filter })) {
        setAnswer(event as Answer) // 서버가 누적된 Answer 스냅샷을 보낸다고 가정
      }
    } finally {
      setLoading(false)
    }
  }

  return { answer, loading, ask }
}
