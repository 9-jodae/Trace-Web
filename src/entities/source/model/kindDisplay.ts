import type { SourceKind } from '@/entities/document/@x/source'

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  LOCAL: '로컬',
  OBSIDIAN: 'Obsidian',
  NOTION: 'Notion',
}

export function sourceKindLabel(kind: string): string {
  return SOURCE_KIND_LABEL[kind as SourceKind] ?? kind
}
