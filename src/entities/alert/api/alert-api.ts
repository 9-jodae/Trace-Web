import { http } from '@/shared/api'
import type { ImpactAlert } from '../model/types'

export const alertApi = {
  list: () => http<ImpactAlert[]>('/alerts'),
}
