import { Badge } from '@/shared/ui'
import type { ProcessingStatus } from '../model/types'

const LABEL: Record<ProcessingStatus, string> = {
  pending: '대기',
  processing: '처리 중',
  done: '완료',
  failed: '실패',
}

export function DocumentStatusBadge({ status }: { status: ProcessingStatus }) {
  return <Badge>{LABEL[status]}</Badge>
}
