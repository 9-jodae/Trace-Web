import { request } from '@/shared/api'

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  tokenType: 'Bearer'
}

export function login(body: LoginRequest) {
  return request<TokenResponse>({ method: 'POST', url: '/api/auth/login', data: body })
}
