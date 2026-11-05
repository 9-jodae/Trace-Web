import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiRequestError, request, unwrap } from './client'
import { toErrorMessage } from './errorMessage'
import { toFieldErrors } from './fieldErrors'
import { TOKEN_STORAGE_KEY, useTokenStore } from './token'

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

function failWith(status: number, code: string) {
  return async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('failed', String(status), config, null, {
      status,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
      data: { success: false, data: null, error: { code, message: '서버 메시지' } },
    })
  }
}

describe('request', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useTokenStore.setState({ accessToken: 'token' })
  })

  it('401 응답이면 토큰을 지운다', async () => {
    await expect(
      request({ url: '/api/users/me', adapter: failWith(401, 'UNAUTHENTICATED') }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
    expect(useTokenStore.getState().accessToken).toBeNull()
  })

  it('401이 아닌 오류에는 토큰을 유지한다', async () => {
    await expect(
      request({ url: '/api/documents/x', adapter: failWith(404, 'NOT_FOUND') }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(useTokenStore.getState().accessToken).toBe('token')
  })

  it('시간 초과는 TIMEOUT 코드로 바꾼다', async () => {
    const timeout = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('timeout', AxiosError.ECONNABORTED, config)
    }
    await expect(request({ url: '/api/x', adapter: timeout })).rejects.toMatchObject({
      code: 'TIMEOUT',
    })
  })
})

describe('useTokenStore', () => {
  it('토큰을 세션 스토리지에 보관한다', () => {
    sessionStorage.clear()
    useTokenStore.getState().setAccessToken('abc')
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toContain('abc')
  })
})

describe('toErrorMessage', () => {
  it('알려진 코드는 정해진 문구로 바꾼다', () => {
    const error = new ApiRequestError(502, { code: 'AI_UNAVAILABLE', message: 'raw' })
    expect(toErrorMessage(error)).toBe('AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('입력 오류는 서버 메시지를 그대로 쓴다', () => {
    const error = new ApiRequestError(400, { code: 'INVALID_INPUT', message: '질문을 입력하세요' })
    expect(toErrorMessage(error)).toBe('질문을 입력하세요')
  })

  it('서버 오류가 아니면 일반 문구를 쓴다', () => {
    expect(toErrorMessage(new Error('x'))).toBe('알 수 없는 오류가 발생했습니다.')
  })
})

describe('요청 크기 초과', () => {
  it('응답 봉투 없는 413은 PAYLOAD_TOO_LARGE로 바꾼다', async () => {
    const tooLarge = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('too large', '413', config, null, {
        status: 413,
        statusText: '',
        headers: new AxiosHeaders(),
        config,
        data: '<html>413</html>',
      })
    }
    const error = await request({ url: '/api/x', adapter: tooLarge }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
    expect(toErrorMessage(error)).toBe('업로드 크기 한도를 넘었습니다.')
  })
})

describe('toFieldErrors', () => {
  it('details의 필드별 문구를 꺼내고 형식이 다른 항목은 무시한다', () => {
    const error = new ApiRequestError(400, {
      code: 'INVALID_INPUT',
      message: '입력값이 올바르지 않습니다',
      details: [{ field: 'name', message: '소스 이름을 입력하세요' }, { field: 1 }, null],
    })
    expect(toFieldErrors(error)).toEqual({ name: '소스 이름을 입력하세요' })
    expect(toFieldErrors(new Error('x'))).toEqual({})
  })
})
