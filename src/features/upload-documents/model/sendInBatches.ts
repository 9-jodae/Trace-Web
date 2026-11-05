import type { UploadResult } from '@/entities/document'
import { makeBatches } from '../lib/batches'
import type { UploadItem, UploadProgress } from './types'

const MISSING_RESULT = '서버가 이 파일의 결과를 돌려주지 않았습니다'

/**
 * 보낼 파일(ready·failed)을 묶음으로 나눠 하나씩 순서대로 보냅니다. 한 묶음이 실패하면
 * 그 묶음의 파일을 모두 전송 실패로 표시하고 다음 묶음을 계속 보냅니다.
 */
export async function sendInBatches(
  items: UploadItem[],
  send: (batch: UploadItem[]) => Promise<UploadResult[]>,
  toMessage: (error: unknown) => string,
  onUpdate: (items: UploadItem[], progress: UploadProgress) => void,
): Promise<UploadItem[]> {
  let current = items
  const targets = items.filter(
    (item) => item.state.type === 'ready' || item.state.type === 'failed',
  )
  const batches = makeBatches(targets)
  let filesDone = 0

  const replace = (updates: Map<number, UploadItem['state']>) => {
    current = current.map((item) =>
      updates.has(item.index) ? { ...item, state: updates.get(item.index)! } : item,
    )
  }

  for (const [batchIndex, batch] of batches.entries()) {
    onUpdate(current, {
      batch: batchIndex + 1,
      batchCount: batches.length,
      filesDone,
      filesTotal: targets.length,
    })
    const updates = new Map<number, UploadItem['state']>()
    try {
      const results = await send(batch)
      batch.forEach((item, position) => {
        const result = results[position]
        updates.set(
          item.index,
          result ? { type: 'done', result } : { type: 'failed', message: MISSING_RESULT },
        )
      })
    } catch (error) {
      const message = toMessage(error)
      for (const item of batch) updates.set(item.index, { type: 'failed', message })
    }
    replace(updates)
    filesDone += batch.length
  }

  onUpdate(current, {
    batch: batches.length,
    batchCount: batches.length,
    filesDone,
    filesTotal: targets.length,
  })
  return current
}
