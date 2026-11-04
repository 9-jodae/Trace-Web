import { API_BASE_URL } from '@/shared/config'

/** SSE 형식 스트리밍 응답을 줄 단위 이벤트로 읽어온다 (답변 스트리밍용) */
export async function* streamEvents(path: string, body: unknown): AsyncGenerator<unknown> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) if (line.startsWith('data: ')) yield JSON.parse(line.slice(6))
  }
}
