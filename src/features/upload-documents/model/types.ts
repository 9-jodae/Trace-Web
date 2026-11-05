import type { UploadResult } from '@/entities/document'

/** 고른 파일 하나와 그 처리 단계. 고른 순서(index)를 끝까지 유지합니다. */
export interface UploadItem {
  index: number
  path: string
  file: File
  state: ItemState
}

export type ItemState =
  | { type: 'excluded'; reason: string }
  | { type: 'ready' }
  | { type: 'done'; result: UploadResult }
  | { type: 'failed'; message: string }

export interface UploadProgress {
  batch: number
  batchCount: number
  filesDone: number
  filesTotal: number
}

/** 결과 표의 한 줄 분류 */
export type ResultKind =
  'created' | 'newVersion' | 'unchanged' | 'excluded' | 'clientExcluded' | 'failed' | 'unknown'

export interface ResultSummary {
  created: number
  newVersion: number
  unchanged: number
  excluded: number
  failed: number
}
