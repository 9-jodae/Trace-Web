import { afterEach, describe, expect, it } from 'vitest'
import { file, mockServer, ok } from '@/shared/testing'
import {
  documentKeys,
  downloadDocument,
  fetchAllDocuments,
  getDocument,
  getDocumentStatus,
} from './documentApi'

let restore: () => void = () => {}

describe('fetchAllDocuments', () => {
  afterEach(() => restore())

  it('모든 페이지를 받아 순서대로 합친다', async () => {
    const pages: unknown[] = []
    restore = mockServer((config) => {
      const page = (config.params as { page: number }).page
      pages.push(config.params)
      return ok({ items: [{ id: `d${page}` }], page, size: 100, totalElements: 3, totalPages: 3 })
    })

    const documents = await fetchAllDocuments()

    expect(documents.map((document) => document.id)).toEqual(['d0', 'd1', 'd2'])
    expect(pages).toEqual([
      { page: 0, size: 100 },
      { page: 1, size: 100 },
      { page: 2, size: 100 },
    ])
  })

  it('문서가 없으면 한 번만 요청한다', async () => {
    let calls = 0
    restore = mockServer(() => {
      calls += 1
      return ok({ items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })
    })

    expect(await fetchAllDocuments()).toEqual([])
    expect(calls).toBe(1)
  })
})

describe('문서 단건 API', () => {
  afterEach(() => restore())

  it('문서 ID를 인코딩해 상세·원문 다운로드·상태 엔드포인트를 호출한다', async () => {
    const urls: string[] = []
    restore = mockServer((config) => {
      urls.push(config.url ?? '')
      if (config.url?.endsWith('/download')) return file('원문 내용')
      if (config.url?.endsWith('/status')) return ok(null)
      return ok({ document: { id: 'doc/1' }, departmentIds: [], versions: [], job: null })
    })

    await getDocument('doc/1')
    const blob = await downloadDocument('doc/1')
    await getDocumentStatus('doc/1')

    expect(await blob.text()).toBe('원문 내용')
    expect(urls).toEqual([
      '/api/documents/doc%2F1',
      '/api/documents/doc%2F1/download',
      '/api/documents/doc%2F1/status',
    ])
    expect(documentKeys.detail('d1')).toEqual(['document', 'detail', 'd1'])
    expect(documentKeys.file('d1', 2)).toEqual(['document', 'file', 'd1', 2])
    expect(documentKeys.status('d1')).toEqual(['document', 'status', 'd1'])
  })
})
