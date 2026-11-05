import { useEffect, useState } from 'react'

const TYPE_MS = 70
const DELETE_MS = 30
const HOLD_MS = 1600
const PAUSE_MS = 400

/**
 * 문장을 한 글자씩 썼다가 지우기를 반복합니다. 다 지우면 다음 문장으로 넘어가고, 끝나면 처음으로 돌아갑니다.
 * `enabled`가 false면 멈추고 첫 문장을 그대로 돌려줍니다.
 */
export function useTypewriter(sentences: readonly string[], enabled: boolean) {
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const sentence = sentences[index % sentences.length] ?? ''

  useEffect(() => {
    if (!enabled) return
    const delay = deleting
      ? length === 0
        ? PAUSE_MS
        : DELETE_MS
      : length === sentence.length
        ? HOLD_MS
        : TYPE_MS
    const timer = window.setTimeout(() => {
      if (!deleting && length < sentence.length) setLength(length + 1)
      else if (!deleting) setDeleting(true)
      else if (length > 0) setLength(length - 1)
      else {
        setDeleting(false)
        setIndex((current) => (current + 1) % sentences.length)
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [enabled, deleting, length, sentence, sentences.length])

  return enabled ? sentence.slice(0, length) : (sentences[0] ?? '')
}
