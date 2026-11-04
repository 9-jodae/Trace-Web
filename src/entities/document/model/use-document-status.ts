import { useQuery } from '@tanstack/react-query'
import { documentApi } from '../api/document-api'

/** 업로드 후 처리 상태를 폴링. 완료/실패 시 폴링 중단 */
export function useDocumentStatus(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentApi.get(id),
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s === 'done' || s === 'failed' ? false : 2000
    },
  })
}
