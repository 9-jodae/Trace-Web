import { create } from 'zustand'

export interface DocumentFilterState {
  /** 서버 enum 값(HANDOVER 등) 또는 분류 전 문서를 뜻하는 'UNCLASSIFIED'. */
  documentTypes: string[]
  extensions: string[]
  authoredFrom: string | null
  authoredTo: string | null
  ownerDepartmentIds: string[]
  /** 작성자 이름 부분 검색. 서버에 작성자 필터 파라미터가 없어 클라이언트에서만 적용합니다. */
  authorQuery: string
}

interface FilterStore {
  filter: DocumentFilterState
  toggleDocumentType: (value: string) => void
  toggleExtension: (value: string) => void
  toggleOwnerDepartmentId: (value: string) => void
  setAuthoredFrom: (value: string | null) => void
  setAuthoredTo: (value: string | null) => void
  setAuthorQuery: (value: string) => void
  reset: () => void
}

const initialFilter: DocumentFilterState = {
  documentTypes: [],
  extensions: [],
  authoredFrom: null,
  authoredTo: null,
  ownerDepartmentIds: [],
  authorQuery: '',
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export const useDocumentFilterStore = create<FilterStore>()((set) => ({
  filter: initialFilter,

  toggleDocumentType: (value) =>
    set((state) => ({
      filter: { ...state.filter, documentTypes: toggle(state.filter.documentTypes, value) },
    })),
  toggleExtension: (value) =>
    set((state) => ({
      filter: { ...state.filter, extensions: toggle(state.filter.extensions, value) },
    })),
  toggleOwnerDepartmentId: (value) =>
    set((state) => ({
      filter: {
        ...state.filter,
        ownerDepartmentIds: toggle(state.filter.ownerDepartmentIds, value),
      },
    })),
  setAuthoredFrom: (value) =>
    set((state) => ({ filter: { ...state.filter, authoredFrom: value } })),
  setAuthoredTo: (value) => set((state) => ({ filter: { ...state.filter, authoredTo: value } })),
  setAuthorQuery: (value) => set((state) => ({ filter: { ...state.filter, authorQuery: value } })),
  reset: () => set({ filter: initialFilter }),
}))
