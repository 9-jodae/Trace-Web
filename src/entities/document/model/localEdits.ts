import { create } from 'zustand'

/**
 * 개발 서버에서만 쓰는 시험 저장. 로컬 Spring이 운영에 붙어 있어도 문서를 바꾸지 않도록 메모리에만 두며,
 * 새로고침하면 사라집니다. 재적재가 연결되면 서버 저장으로 시험합니다(docs199-Server #89).
 */
export function isLocalEditMode() {
  return import.meta.env.DEV
}

/**
 * 재적재가 연결된 환경에서만 수정 제안을 서버에 저장합니다(docs199-Server #89, #93).
 * 연결 전 저장은 문서를 검색에서 빠지게 하므로 기본은 꺼 둡니다.
 */
export function isServerEditEnabled() {
  return import.meta.env.VITE_EDIT_PROPOSAL_SAVE === 'true'
}

export interface LocalEdit {
  title: string
  text: string
  /** 수정 제안으로 충돌을 해소했다고 본 상대 문서. 있으면 관련 간선을 경고하지 않고, 이 쌍의 충돌만 지웁니다. */
  resolvedWith?: string[]
}

interface LocalEditState {
  edits: Record<string, LocalEdit>
  saveEdit: (documentId: string, edit: LocalEdit) => void
}

export const useLocalEditStore = create<LocalEditState>((set) => ({
  edits: {},
  saveEdit: (documentId, edit) =>
    set((state) => ({ edits: { ...state.edits, [documentId]: edit } })),
}))
