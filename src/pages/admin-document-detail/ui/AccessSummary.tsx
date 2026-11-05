import type { Department } from '@/entities/department'
import { clearanceLabel, positionLabel, type DocumentDetail } from '@/entities/document'
import { InfoRow } from './Card'

export function AccessSummary({
  detail,
  departments,
}: {
  detail: DocumentDetail
  departments: Department[]
}) {
  const names = detail.departmentIds.map(
    (id) => departments.find((department) => department.id === id)?.name ?? '알 수 없는 부서',
  )
  return (
    <dl>
      <InfoRow label="보안 등급">{clearanceLabel(detail.document.clearance)}</InfoRow>
      <InfoRow label="열람 부서">{names.length === 0 ? '전체 부서' : names.join(', ')}</InfoRow>
      <InfoRow label="최소 직급">{positionLabel(detail.document.minimumPosition)}</InfoRow>
    </dl>
  )
}
