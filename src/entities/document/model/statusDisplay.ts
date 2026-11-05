import type { ProcessingStatus } from './types'

export const PROCESSING_STATUS_LABEL: Record<ProcessingStatus, string> = {
  PENDING: '대기',
  PROCESSING: '처리 중',
  DONE: '완료',
  FAILED: '실패',
}

export const PROCESSING_STATUS_OPTIONS = Object.keys(PROCESSING_STATUS_LABEL) as ProcessingStatus[]

export function isProcessingStatus(value: string | null): value is ProcessingStatus {
  return value !== null && value in PROCESSING_STATUS_LABEL
}
