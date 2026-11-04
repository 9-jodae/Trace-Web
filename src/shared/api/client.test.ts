import { describe, expect, it } from 'vitest'
import { ApiRequestError, unwrap } from './client'

describe('unwrap', () => {
  it('성공 응답에서 data를 꺼낸다', () => {
    expect(unwrap(200, { success: true, data: { id: 1 }, error: null })).toEqual({ id: 1 })
  })

  it('실패 응답은 서버 오류 코드를 담은 ApiRequestError로 바꾼다', () => {
    const body = {
      success: false,
      data: null,
      error: { code: 'UNAUTHENTICATED', message: '인증이 필요합니다' },
    }

    const run = () => unwrap(401, body)

    expect(run).toThrow(ApiRequestError)
    expect(run).toThrow(expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' }))
  })
})
