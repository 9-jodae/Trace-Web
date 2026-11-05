/**
 * 문서 유형 표시명과 색. 서버 enum(HANDOVER/APPROVAL/REPORT/PRESENTATION/ETC) 5개만 다룹니다.
 * 분류 전(null)이거나 서버가 새 값을 추가했을 때는 UNCLASSIFIED로 표시합니다.
 * 색은 전부 파란 계열 하나로 통일하고 명도·채도로만 유형을 구분합니다(그래프 글로우 톤과 맞춤).
 */
export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  HANDOVER: '인수인계',
  APPROVAL: '결재',
  REPORT: '보고서',
  PRESENTATION: '발표',
  ETC: '기타',
}

export const DOCUMENT_TYPE_COLOR: Record<string, string> = {
  HANDOVER: '#bae6fd',
  APPROVAL: '#60a5fa',
  REPORT: '#3b82f6',
  PRESENTATION: '#1d4ed8',
  ETC: '#64748b',
}

export const UNCLASSIFIED_TYPE_COLOR = '#334155'

export function documentTypeLabel(documentType: string | null): string {
  if (documentType === null) return '분류 전'
  return DOCUMENT_TYPE_LABEL[documentType] ?? documentType
}

export function documentTypeColor(documentType: string | null): string {
  if (documentType === null) return UNCLASSIFIED_TYPE_COLOR
  return DOCUMENT_TYPE_COLOR[documentType] ?? UNCLASSIFIED_TYPE_COLOR
}
