import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/api'
import type { Citation } from '@/entities/citation'
import { TextViewer } from './text-viewer'

interface Props {
  documentId: string
  version?: number
  citationId?: string
}

export function DocumentViewer({ documentId, version, citationId }: Props) {
  const { data } = useQuery({
    queryKey: ['document-content', documentId, version],
    queryFn: () => http<{ text: string }>(`/documents/${documentId}/content?v=${version ?? ''}`),
  })
  const { data: citation } = useQuery({
    queryKey: ['citation', citationId],
    queryFn: () => http<Citation>(`/citations/${citationId}`),
    enabled: !!citationId,
  })
  if (!data) return <p>불러오는 중…</p>
  return <TextViewer text={data.text} highlight={citation?.range} />
}
