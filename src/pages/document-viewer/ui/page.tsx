import { useParams, useSearchParams } from 'react-router-dom'
import { Header } from '@/widgets/header'
import { DocumentViewer } from '@/widgets/document-viewer'
import { GraphCanvas } from '@/widgets/graph-canvas'

export function DocumentViewerPage() {
  const { docId = '' } = useParams()
  const [params] = useSearchParams()
  const v = params.get('v')
  return (
    <>
      <Header />
      <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <DocumentViewer documentId={docId} version={v ? Number(v) : undefined} citationId={params.get('cite') ?? undefined} />
        <GraphCanvas documentIds={[docId]} />
      </main>
    </>
  )
}
