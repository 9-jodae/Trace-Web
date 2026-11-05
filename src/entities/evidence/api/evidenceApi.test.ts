import { afterEach, describe, expect, it } from 'vitest'
import { mockServer, ok } from '@/shared/testing'
import { getEvidence } from './evidenceApi'

let restore: () => void = () => {}

describe('getEvidence', () => {
  afterEach(() => restore())

  it('chunkId를 URL 인코딩해 근거 조회 API를 호출한다', async () => {
    let requestedUrl = ''
    restore = mockServer((config) => {
      requestedUrl = config.url ?? ''
      return ok({
        chunkId: 'chunk/1#a',
        documentId: 'd1',
        documentTitle: '연차 규정',
        extension: 'md',
        versionId: 'v1',
        versionNumber: 1,
        content: '본문',
        charStart: 0,
        charEnd: 2,
        page: null,
        previousChunk: null,
        nextChunk: null,
        downloadUrl: 'https://storage.local/secret-presigned-url',
      })
    })

    const evidence = await getEvidence('chunk/1#a')

    expect(requestedUrl).toBe('/api/evidence/chunk%2F1%23a')
    expect(evidence.chunkId).toBe('chunk/1#a')
  })
})
