import type { Department } from '@/entities/department'
import type { DocumentDetail } from '@/entities/document'
import { sourceKindLabel, type Source } from '@/entities/source'
import { formatDateTime } from '../lib/format'
import { Card, InfoRow } from './Card'

/** 기본 정보. 상세 응답에 소스 이름이 없어 소스 목록에서 찾아 표시합니다. */
export function DocumentInfoCard({
  detail,
  sources,
  departments,
}: {
  detail: DocumentDetail
  sources: Source[]
  departments: Department[]
}) {
  const { document } = detail
  const source = sources.find((item) => item.id === document.sourceId)
  const owner = departments.find((item) => item.id === document.ownerDepartmentId)

  return (
    <Card title="기본 정보">
      <dl>
        <InfoRow label="소스">
          {source ? `${source.name} · ${sourceKindLabel(source.kind)}` : '—'}
        </InfoRow>
        <InfoRow label="경로">{document.relativePath}</InfoRow>
        <InfoRow label="확장자">.{document.extension}</InfoRow>
        <InfoRow label="작성자">{document.author ?? '—'}</InfoRow>
        <InfoRow label="작성일">{document.authoredAt ?? '—'}</InfoRow>
        <InfoRow label="원본 수정 시각">{formatDateTime(document.sourceModifiedAt)}</InfoRow>
        <InfoRow label="소유 부서">
          {document.ownerDepartmentId ? (owner?.name ?? '—') : '없음'}
        </InfoRow>
      </dl>
    </Card>
  )
}
