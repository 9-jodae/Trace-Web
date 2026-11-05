import type { Document } from '@/entities/document'
import type { DocumentFilterState } from '../model/filterStore'

export function matchesFilter(document: Document, filter: DocumentFilterState): boolean {
  const typeKey = document.documentType ?? 'UNCLASSIFIED'
  if (filter.documentTypes.length > 0 && !filter.documentTypes.includes(typeKey)) return false
  if (filter.extensions.length > 0 && !filter.extensions.includes(document.extension)) return false
  if (filter.authoredFrom && (!document.authoredAt || document.authoredAt < filter.authoredFrom))
    return false
  if (filter.authoredTo && (!document.authoredAt || document.authoredAt > filter.authoredTo))
    return false
  if (
    filter.ownerDepartmentIds.length > 0 &&
    (!document.ownerDepartmentId || !filter.ownerDepartmentIds.includes(document.ownerDepartmentId))
  ) {
    return false
  }
  const authorQuery = filter.authorQuery.trim().toLowerCase()
  if (authorQuery && !(document.author?.toLowerCase().includes(authorQuery) ?? false)) return false
  return true
}

export function filterDocuments(documents: Document[], filter: DocumentFilterState): Document[] {
  return documents.filter((document) => matchesFilter(document, filter))
}

export function availableExtensions(documents: Document[]): string[] {
  return [...new Set(documents.map((document) => document.extension))].sort()
}
