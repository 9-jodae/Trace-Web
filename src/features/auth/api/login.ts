import { http } from '@/shared/api'
import type { User } from '@/entities/user'

export const login = (email: string, password: string) =>
  http<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
