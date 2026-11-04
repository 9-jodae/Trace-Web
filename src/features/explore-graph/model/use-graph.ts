import { useQuery } from '@tanstack/react-query'
import { graphApi } from '@/entities/graph'

export function useDocumentGraph(documentIds: string[]) {
  return useQuery({
    queryKey: ['graph', documentIds],
    queryFn: () => graphApi.around(documentIds),
    enabled: documentIds.length > 0,
  })
}
