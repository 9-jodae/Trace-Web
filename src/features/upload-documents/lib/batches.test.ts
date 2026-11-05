import { describe, expect, it } from 'vitest'
import { MAX_BATCH_BYTES, MAX_BATCH_FILES } from '@/shared/config'
import { makeBatches } from './batches'

const MB = 1024 * 1024
const item = (id: number, size: number) => ({ id, file: { size } })
const ids = (batches: { id: number }[][]) => batches.map((batch) => batch.map((entry) => entry.id))

describe('makeBatches', () => {
  it('크기 합이 90MB를 넘기 직전에 끊는다', () => {
    const items = [item(1, 45 * MB), item(2, 45 * MB), item(3, 1)]
    expect(ids(makeBatches(items))).toEqual([[1, 2], [3]])
    expect(MAX_BATCH_BYTES).toBe(90 * MB)
  })

  it('파일 수가 50개에 이르면 끊는다', () => {
    const items = Array.from({ length: MAX_BATCH_FILES + 1 }, (_, index) => item(index, 1))
    const batches = makeBatches(items)
    expect(batches.map((batch) => batch.length)).toEqual([50, 1])
  })

  it('90MB에 가까운 파일은 혼자 한 묶음이 되고 순서를 지킨다', () => {
    const items = [item(1, 10 * MB), item(2, 89 * MB), item(3, 2 * MB)]
    expect(ids(makeBatches(items))).toEqual([[1], [2], [3]])
  })

  it('빈 목록은 묶음을 만들지 않는다', () => {
    expect(makeBatches([])).toEqual([])
  })
})
