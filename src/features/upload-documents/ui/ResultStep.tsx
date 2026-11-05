import { Link } from 'react-router'
import { resultKind, summarize } from '../lib/items'
import type { ResultKind, UploadItem } from '../model/types'

const KIND_LABEL: Record<ResultKind, string> = {
  created: '새 문서',
  newVersion: '새 버전',
  unchanged: '변경 없음',
  excluded: '제외',
  clientExcluded: '제외(보내지 않음)',
  failed: '전송 실패',
  unknown: '',
}

const KIND_CLASS: Partial<Record<ResultKind, string>> = {
  created: 'text-emerald-300',
  newVersion: 'text-sky-300',
  failed: 'text-red-300',
}

/** 4단계: 요약과 파일별 결과. 클라이언트에서 제외한 파일도 원래 순서대로 함께 보여줍니다. */
export function ResultStep({ items }: { items: UploadItem[] }) {
  const summary = summarize(items)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium" aria-live="polite">
        새 문서 {summary.created} · 새 버전 {summary.newVersion} · 변경 없음 {summary.unchanged} ·
        제외 {summary.excluded} · 전송 실패 {summary.failed}
      </p>
      <div className="max-h-[50vh] overflow-auto rounded-lg border border-border-dark">
        <table className="w-full table-fixed text-xs">
          <thead className="sticky top-0 bg-panel text-left text-ink-muted">
            <tr>
              <th className="w-[46%] px-3 py-2 font-medium">경로</th>
              <th className="w-[18%] px-3 py-2 font-medium">결과</th>
              <th className="w-[10%] px-3 py-2 font-medium">버전</th>
              <th className="w-[26%] px-3 py-2 font-medium">사유</th>
            </tr>
          </thead>
          <tbody className="text-ink-dim">
            {items.map((item) => (
              <ResultRow key={item.index} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultRow({ item }: { item: UploadItem }) {
  const kind = resultKind(item)
  const { state } = item
  const result = state.type === 'done' ? state.result : null
  const label =
    kind === 'unknown' ? (result?.outcome ?? '') : kind === null ? '대기' : KIND_LABEL[kind]
  const reason =
    state.type === 'excluded'
      ? state.reason
      : state.type === 'failed'
        ? state.message
        : (result?.reason ?? '')
  const linkable = (kind === 'created' || kind === 'newVersion') && result?.documentId

  return (
    <tr className="border-t border-border-dark">
      <td className="truncate px-3 py-1.5" title={item.path}>
        {linkable ? (
          <Link
            to={`/admin/documents/${encodeURIComponent(result.documentId!)}`}
            className="text-ink hover:underline"
          >
            {item.path}
          </Link>
        ) : (
          item.path
        )}
      </td>
      <td className={`px-3 py-1.5 ${kind ? (KIND_CLASS[kind] ?? '') : ''}`}>{label}</td>
      <td className="px-3 py-1.5 tabular-nums">{result?.version ? `v${result.version}` : '—'}</td>
      <td className="truncate px-3 py-1.5" title={reason}>
        {reason}
      </td>
    </tr>
  )
}
