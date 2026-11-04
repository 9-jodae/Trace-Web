import { http } from '@/shared/api'
import type { Source } from '../model/types'

export const sourceApi = {
  list: () => http<Source[]>('/sources'),
  sync: (id: string) => http<void>(`/sources/${id}/sync`, { method: 'POST' }),
}
