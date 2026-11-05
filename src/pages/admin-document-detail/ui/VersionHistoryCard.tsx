import type { DocumentVersion } from '@/entities/document'
import { formatDateTime, formatFileSize } from '../lib/format'
import { Card } from '@/shared/ui'

/** 버전 이력(최신이 위). 이전 버전 원문은 서버가 주지 않아 내려받기를 두지 않습니다. */
export function VersionHistoryCard({ versions }: { versions: DocumentVersion[] }) {
  const sorted = [...versions].sort((a, b) => b.number - a.number)
  return (
    <Card title="버전 이력">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-muted">
          <tr>
            <th className="py-1.5 font-medium">버전</th>
            <th className="py-1.5 font-medium">업로드 시각</th>
            <th className="py-1.5 font-medium">크기</th>
            <th className="py-1.5 font-medium">해시</th>
          </tr>
        </thead>
        <tbody className="text-ink-dim">
          {sorted.map((version) => (
            <tr key={version.id} className="border-t border-border-dark">
              <td className="py-1.5 tabular-nums">v{version.number}</td>
              <td className="py-1.5">{formatDateTime(version.createdAt)}</td>
              <td className="py-1.5 tabular-nums">{formatFileSize(version.fileSize)}</td>
              <td className="py-1.5 font-mono text-xs">{version.contentHash.slice(0, 8)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
