import { afterEach, describe, expect, it } from 'vitest'
import { mockServer, ok } from '@/shared/testing'
import { getGraph, graphKeys } from './graphApi'

let restore: () => void = () => {}

describe('getGraph', () => {
  afterEach(() => restore())

  it('documentId 없이 부르면 쿼리 파라미터 없이 전체 그래프를 요청한다', async () => {
    let params: unknown
    restore = mockServer((config) => {
      params = config.params
      return ok({ nodes: [], edges: [] })
    })

    const graph = await getGraph()

    expect(graph).toEqual({ nodes: [], edges: [] })
    expect(params).toEqual({})
  })

  it('documentId·depth를 쿼리 파라미터로 넘긴다', async () => {
    let url: string | undefined
    let params: unknown
    restore = mockServer((config) => {
      url = config.url
      params = config.params
      return ok({ nodes: [], edges: [] })
    })

    await getGraph({ documentId: 'd1', depth: 2 })

    expect(url).toBe('/api/graph')
    expect(params).toEqual({ documentId: 'd1', depth: 2 })
  })

  it('쿼리 키는 전체 그래프와 documentId별 부분 그래프를 구분한다', () => {
    expect(graphKeys.full).toEqual(['graph', 'full'])
    expect(graphKeys.scoped({ documentId: 'd1', depth: 1 })).toEqual(['graph', 'scoped', 'd1', 1])
  })
})
