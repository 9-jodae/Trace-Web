import { afterEach, describe, expect, it } from 'vitest'
import { mockServer, ok } from '@/shared/testing'
import { fetchAllDocuments } from './documentApi'

let restore: () => void = () => {}

describe('fetchAllDocuments', () => {
  afterEach(() => restore())

  it('모든 페이지를 차례로 받아 합친다', async () => {
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
