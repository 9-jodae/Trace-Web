export { evidenceKeys, getEvidence, useEvidence } from './api/evidenceApi'
export {
  splitHighlight,
  splitHighlights,
  type HighlightParts,
  type HighlightSegment,
} from './lib/highlight'
export { findTextRanges, normalizeForMatch } from './lib/textRanges'
export type { EvidenceChunk } from './model/types'
export { EvidencePassage } from './ui/EvidencePassage'
