import { MAX_BATCH_BYTES, MAX_BATCH_FILES } from '@/shared/config'

/**
 * 순서를 유지하며 요청 하나에 담을 묶음으로 나눕니다. 크기 합이 maxBytes를 넘거나
 * 파일 수가 maxFiles에 이르면 새 묶음을 시작합니다. 파일 하나가 한도보다 커도 혼자 한 묶음이 됩니다.
 */
export function makeBatches<T extends { file: { size: number } }>(
  items: T[],
  maxBytes = MAX_BATCH_BYTES,
  maxFiles = MAX_BATCH_FILES,
): T[][] {
  const batches: T[][] = []
  let current: T[] = []
  let bytes = 0
  for (const item of items) {
    const size = item.file.size
    if (current.length > 0 && (bytes + size > maxBytes || current.length >= maxFiles)) {
      batches.push(current)
      current = []
      bytes = 0
    }
    current.push(item)
    bytes += size
  }
  if (current.length > 0) batches.push(current)
  return batches
}
