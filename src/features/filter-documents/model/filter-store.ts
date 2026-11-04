import { create } from 'zustand'
import type { DocumentType, FileExtension } from '@/shared/config'
import type { SourceKind } from '@/entities/source'

export interface SearchFilter {
  sources: SourceKind[] // 비어 있으면 전체 문서함
  types: DocumentType[]
  extensions: FileExtension[]
  period: { from?: string; to?: string }
}

interface FilterState {
  filter: SearchFilter
  setFilter: (patch: Partial<SearchFilter>) => void
  reset: () => void
}

const initial: SearchFilter = { sources: [], types: [], extensions: [], period: {} }

export const useSearchFilter = create<FilterState>((set) => ({
  filter: initial,
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  reset: () => set({ filter: initial }),
}))
