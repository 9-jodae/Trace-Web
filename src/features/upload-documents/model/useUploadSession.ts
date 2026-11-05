import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  adminErrorMessage,
  adminUploadDocuments,
  invalidateAfterDocumentChange,
  type UploadOptions,
} from '@/entities/document'
import { toUploadItems, type PickedFile } from '../lib/items'
import { sendInBatches } from './sendInBatches'
import type { UploadItem, UploadProgress } from './types'

export type UploadPhase = 'pick' | 'options' | 'sending' | 'done'

/** 업로드 모달 한 번의 상태(고른 파일, 단계, 진행). 모달을 닫으면 사라집니다. */
export function useUploadSession(sourceId: string) {
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<UploadPhase>('pick')
  const [items, setItems] = useState<UploadItem[]>([])
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const lastOptions = useRef<UploadOptions | null>(null)

  const run = async (source: UploadItem[], options: UploadOptions) => {
    lastOptions.current = options
    setPhase('sending')
    await sendInBatches(
      source,
      (batch) =>
        adminUploadDocuments(
          sourceId,
          batch.map(({ file, path }) => ({ file, path })),
          options,
        ),
      adminErrorMessage,
      (next, nextProgress) => {
        setItems(next)
        setProgress(nextProgress)
      },
    )
    setPhase('done')
    // 결과 표에서 상세로 바로 이동해도 목록·그래프가 새 값을 보이도록 끝나자마자 무효화합니다.
    void invalidateAfterDocumentChange(queryClient)
  }

  return {
    phase,
    items,
    progress,
    pick: (picked: PickedFile[]) => setItems(toUploadItems(picked)),
    toOptions: () => setPhase('options'),
    backToPick: () => setPhase('pick'),
    start: (options: UploadOptions) => run(items, options),
    retryFailed: () => (lastOptions.current ? run(items, lastOptions.current) : undefined),
  }
}
