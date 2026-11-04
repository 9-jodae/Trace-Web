export type RiskLevel = 'low' | 'medium' | 'high'

/** 문서 변경 → 연결 문서에 오개념 가능성 알림 */
export interface ImpactAlert {
  id: string
  changedDocumentId: string
  affectedDocumentId: string
  affectedDocumentTitle: string
  risk: RiskLevel
  reason: string
  createdAt: string
  read: boolean
}
