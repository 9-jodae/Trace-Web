import { Link } from 'react-router-dom'
import type { Citation } from '../model/types'
import { toViewerUrl } from '../lib/to-viewer-url'

export function CitationChip({ citation, index }: { citation: Citation; index: number }) {
  return (
    <Link to={toViewerUrl(citation)} title={`${citation.documentTitle} · ${citation.quote}`}>
      [{index + 1}]
    </Link>
  )
}
