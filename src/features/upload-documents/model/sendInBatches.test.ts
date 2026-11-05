import { describe, expect, it } from 'vitest'
import type { UploadResult } from '@/entities/document'
import { resultKind, summarize, toUploadItems } from '../lib/items'
import { sendInBatches } from './sendInBatches'
import type { UploadItem } from './types'

const MB = 1024 * 1024

function fakeFile(name: string, size: number): File {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const picked = (entries: [string, number][]) =>
  toUploadItems(
    entries.map(([rawPath, size]) => ({
      file: fakeFile(rawPath, size),
      rawPath,
      fromFolder: true,
    })),
  )

const created = (path: string, version = 1): UploadResult => ({
  path,
  documentId: `id-${path}`,
  version,
  outcome: 'CREATED',
  reason: null,
})

describe('toUploadItems', () => {
  it('경로를 만들고 미리 거르며 같은 경로가 또 나오면 뒤의 것을 뺀다', () => {
    const items = picked([
      ['vault/a.md', 10],
      ['vault/.obsidian/x.md', 10],
      ['vault/a.md', 10],
    ])
    expect(items.map((item) => [item.path, item.state])).toEqual([
      ['a.md', { type: 'ready' }],
      ['.obsidian/x.md', { type: 'excluded', reason: 'Obsidian 설정·휴지통' }],
      ['a.md', { type: 'excluded', reason: '같은 경로 중복' }],
    ])
  })
})

describe('sendInBatches', () => {
  it('서버 결과와 클라이언트 제외 목록을 원래 순서로 합치고 실패한 묶음을 표시한다', async () => {
    const items = picked([
      ['v/a.md', 20 * MB],
      ['v/skip.docx', 10],
      ['v/b.md', 20 * MB],
      ['v/x.md', 20 * MB],
      ['v/y.md', 20 * MB],
      ['v/c.md', 20 * MB],
      ['v/d.md', 10],
    ])
    const sent: string[][] = []
    const progress: string[] = []

    const result = await sendInBatches(
      items,
      async (batch) => {
        sent.push(batch.map((item) => item.path))
        if (batch[0]?.path === 'c.md') throw new Error('network')
        return batch.map((item) => created(item.path, item.path === 'b.md' ? 3 : 1))
      },
      () => '서버에 연결할 수 없습니다',
      (_, p) => progress.push(`${p.batch}/${p.batchCount} ${p.filesDone}/${p.filesTotal}`),
    )

    expect(sent).toEqual([
      ['a.md', 'b.md', 'x.md', 'y.md'],
      ['c.md', 'd.md'],
    ])
    expect(progress).toEqual(['1/2 0/6', '2/2 4/6', '2/2 6/6'])
    expect(result.map((item) => [item.path, resultKind(item)])).toEqual([
      ['a.md', 'created'],
      ['skip.docx', 'clientExcluded'],
      ['b.md', 'newVersion'],
      ['x.md', 'created'],
      ['y.md', 'created'],
      ['c.md', 'failed'],
      ['d.md', 'failed'],
    ])
    expect(summarize(result)).toEqual({
      created: 3,
      newVersion: 1,
      unchanged: 0,
      excluded: 1,
      failed: 2,
    })
  })

  it('다시 보내기는 실패한 파일만 보낸다', async () => {
    const items: UploadItem[] = picked([
      ['v/a.md', 10],
      ['v/b.md', 10],
    ]).map((item, index) =>
      index === 0
        ? { ...item, state: { type: 'done', result: created('a.md') } }
        : { ...item, state: { type: 'failed', message: 'x' } },
    )
    const sent: string[] = []
    const result = await sendInBatches(
      items,
      async (batch) => {
        sent.push(...batch.map((item) => item.path))
        return [{ ...created('b.md'), outcome: 'UNCHANGED' }]
      },
      String,
      () => {},
    )
    expect(sent).toEqual(['b.md'])
    expect(result.map(resultKind)).toEqual(['created', 'unchanged'])
  })

  it('서버가 결과를 덜 주면 빠진 파일을 실패로 표시하고 모르는 outcome은 그대로 둔다', async () => {
    const items = picked([
      ['v/a.md', 10],
      ['v/b.md', 10],
    ])
    const result = await sendInBatches(
      items,
      async () => [{ ...created('a.md'), outcome: 'MERGED' }],
      String,
      () => {},
    )
    expect(result.map(resultKind)).toEqual(['unknown', 'failed'])
  })
})
