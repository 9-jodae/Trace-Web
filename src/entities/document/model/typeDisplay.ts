/**
 * 문서 유형 표시명과 색. 서버 enum(HANDOVER/APPROVAL/REPORT/PRESENTATION/ETC) 5개만 다룹니다.
 * 분류 전(null)이거나 서버가 새 값을 추가했을 때는 UNCLASSIFIED로 표시합니다.
 * 색은 디자인(Figma "02 답변 · 관계 그래프 + 근거")에서 가져왔습니다.
 */
export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  HANDOVER: '인수인계',
  APPROVAL: '결재',
  REPORT: '보고서',
  PRESENTATION: '발표',
  ETC: '기타',
}

export const DOCUMENT_TYPE_COLOR: Record<string, string> = {
  HANDOVER: '#d2607e',
  APPROVAL: '#4e9fb3',
  REPORT: '#d9a93b',
  PRESENTATION: '#9c7bd1',
  ETC: '#a39c90',
}

export const UNCLASSIFIED_TYPE_COLOR = '#6b6860'

export function documentTypeLabel(documentType: string | null): string {
  if (documentType === null) return '분류 전'
  return DOCUMENT_TYPE_LABEL[documentType] ?? documentType
}

export function documentTypeColor(documentType: string | null): string {
  if (documentType === null) return UNCLASSIFIED_TYPE_COLOR
  return DOCUMENT_TYPE_COLOR[documentType] ?? UNCLASSIFIED_TYPE_COLOR
}
