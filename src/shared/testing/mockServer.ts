import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { http } from '@/shared/api'

type Reply = { status: number; body: unknown }
type Handler = (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>

/**
 * 테스트 전용: 실제 서버 대신 응답을 돌려주는 어댑터를 http 클라이언트에 연결합니다.
 * 반환한 함수를 호출하면 원래 어댑터로 되돌립니다.
 */
export function mockServer(handler: Handler) {
  const original = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    const { status, body } = await handler(config)
    const response = { status, statusText: '', headers: new AxiosHeaders(), config, data: body }
    if (status >= 400) throw new AxiosError('mock', String(status), config, null, response)
    return response
  }
  return () => {
    http.defaults.adapter = original
  }
}

export const ok = (data: unknown): Reply => ({
  status: 200,
  body: { success: true, data, error: null },
})

export const fail = (status: number, code: string, message = '오류'): Reply => ({
  status,
  body: { success: false, data: null, error: { code, message } },
})
