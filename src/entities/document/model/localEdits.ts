import { create } from 'zustand'

/**
 * 개발 서버에서만 쓰는 시험 저장. 로컬 Spring이 운영에 붙어 있어도 문서를 바꾸지 않도록 메모리에만 두며,
 * 새로고침하면 사라집니다. 재적재가 연결되면 서버 저장으로 시험합니다(docs199-Server #89).
 */
export function isLocalEditMode() {
  return import.meta.env.DEV
}

export interface LocalEdit {
  title: string
  text: string
  /** 수정 제안을 적용해 충돌을 해소한 저장. 직접 고친 저장은 관련 간선을 경고합니다. */
  resolved?: boolean
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
