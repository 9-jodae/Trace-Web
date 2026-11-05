import { describe, expect, it } from 'vitest'
import { parseListQuery, toListSearch } from './listQuery'

describe('목록 URL 쿼리', () => {
  it('쿼리를 읽고 잘못된 상태·페이지는 기본값으로 둔다', () => {
    expect(parseListQuery(new URLSearchParams('source=s1&status=DONE&type=REPORT&page=2'))).toEqual(
      { sourceId: 's1', status: 'DONE', documentType: 'REPORT', page: 2 },
    )
    expect(parseListQuery(new URLSearchParams('status=WRONG&page=-1'))).toEqual({
      sourceId: null,
      status: null,
      documentType: null,
      page: 0,
    })
  })

  it('기본값은 생략하고 나머지만 쿼리로 쓴다', () => {
    const search = toListSearch({ sourceId: 's1', status: null, documentType: 'ETC', page: 0 })
    expect(search.toString()).toBe('source=s1&type=ETC')
  })
})
