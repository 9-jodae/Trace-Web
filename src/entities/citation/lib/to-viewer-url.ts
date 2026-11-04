import type { Citation } from '../model/types'

export function toViewerUrl(c: Citation) {
  return `/documents/${c.documentId}?v=${c.version}&cite=${c.id}`
}
