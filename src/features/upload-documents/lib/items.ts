import { isNewVersion } from '@/entities/document'
import type { ResultKind, ResultSummary, UploadItem } from '../model/types'
import { toSourcePath } from './paths'
import { excludeReason } from './screen'

export interface PickedFile {
  file: File
  /** 폴더 선택이면 webkitRelativePath(또는 드롭한 항목의 전체 경로), 파일 선택이면 파일명 */
  rawPath: string
  fromFolder: boolean
}

/** 고른 파일을 소스 경로로 바꾸고 미리 거릅니다. 같은 경로가 또 나오면 뒤의 것을 뺍니다. */
export function toUploadItems(picked: PickedFile[]): UploadItem[] {
  const seen = new Set<string>()
  return picked.map(({ file, rawPath, fromFolder }, index) => {
    const path = toSourcePath(rawPath, fromFolder)
    const reason = excludeReason(path, file.size) ?? (seen.has(path) ? '같은 경로 중복' : null)
    if (!reason) seen.add(path)
    return { index, path, file, state: reason ? { type: 'excluded', reason } : { type: 'ready' } }
  })
}

/** 결과 표에서 쓰는 분류. 서버가 모르는 outcome을 주면 unknown으로 두고 값을 그대로 표시합니다. */
export function resultKind(item: UploadItem): ResultKind | null {
  const { state } = item
  if (state.type === 'excluded') return 'clientExcluded'
  if (state.type === 'failed') return 'failed'
  if (state.type === 'ready') return null
  const { outcome } = state.result
  if (outcome === 'UNCHANGED') return 'unchanged'
  if (outcome === 'EXCLUDED') return 'excluded'
  if (outcome === 'CREATED' || outcome === 'UPDATED') {
    return isNewVersion(state.result) ? 'newVersion' : 'created'
  }
  return 'unknown'
}

export function summarize(items: UploadItem[]): ResultSummary {
  const summary: ResultSummary = { created: 0, newVersion: 0, unchanged: 0, excluded: 0, failed: 0 }
  for (const item of items) {
    const kind = resultKind(item)
    if (kind === 'created') summary.created += 1
    else if (kind === 'newVersion') summary.newVersion += 1
    else if (kind === 'unchanged') summary.unchanged += 1
    else if (kind === 'excluded' || kind === 'clientExcluded') summary.excluded += 1
    else if (kind === 'failed') summary.failed += 1
  }
  return summary
}
