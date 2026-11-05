import { FileUp, FolderUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { buttonSecondary } from '@/shared/ui'
import { filesFromDrop } from '../lib/dropEntries'
import type { PickedFile } from '../lib/items'
import type { UploadItem } from '../model/types'

/** 1단계: 폴더·파일 고르기와 미리 거른 결과 */
export function PickStep({
  items,
  onPick,
}: {
  items: UploadItem[]
  onPick: (picked: PickedFile[]) => void
}) {
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const sendable = items.filter((item) => item.state.type !== 'excluded')
  const excluded = items.filter((item) => item.state.type === 'excluded')

  const fromInput = (files: FileList | null, fromFolder: boolean) => {
    if (!files) return
    onPick(
      Array.from(files).map((file) => ({
        file,
        rawPath: fromFolder ? file.webkitRelativePath || file.name : file.name,
        fromFolder: fromFolder && file.webkitRelativePath !== '',
      })),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void filesFromDrop(event.dataTransfer).then(onPick)
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center text-sm ${
          dragging ? 'border-white/40 bg-white/5' : 'border-border-dark-strong'
        }`}
      >
        <p className="text-ink-dim">폴더나 파일을 여기에 끌어다 놓으세요</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => folderInput.current?.click()}
            className={buttonSecondary}
          >
            <FolderUp className="size-4" aria-hidden />
            폴더 선택
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={buttonSecondary}
          >
            <FileUp className="size-4" aria-hidden />
            파일 선택
          </button>
        </div>
        <input
          ref={(element) => {
            folderInput.current = element
            element?.setAttribute('webkitdirectory', '')
          }}
          type="file"
          multiple
          hidden
          data-testid="folder-input"
          onChange={(event) => {
            fromInput(event.target.files, true)
            event.target.value = ''
          }}
        />
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept=".pdf,.md"
          data-testid="file-input"
          onChange={(event) => {
            fromInput(event.target.files, false)
            event.target.value = ''
          }}
        />
      </div>

      <p className="text-xs text-ink-muted">
        고른 폴더 안의 경로가 문서 ID가 됩니다. 같은 폴더를 다시 올리면 경로가 같은 문서는 새
        버전으로 처리됩니다.
      </p>

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" aria-live="polite">
            보낼 파일 {sendable.length}개 · 제외 {excluded.length}개
          </p>
          {sendable.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-border-dark text-xs text-ink-dim">
              {sendable.map((item) => (
                <li key={item.index} className="truncate px-3 py-1.5" title={item.path}>
                  {item.path}
                </li>
              ))}
            </ul>
          )}
          {excluded.length > 0 && (
            <details className="rounded-lg border border-border-dark text-xs">
              <summary className="cursor-pointer px-3 py-2 text-ink-dim">
                제외한 파일 {excluded.length}개 보기
              </summary>
              <ul className="max-h-40 overflow-y-auto border-t border-border-dark">
                {excluded.map((item) => (
                  <li key={item.index} className="flex justify-between gap-3 px-3 py-1.5">
                    <span className="truncate text-ink-dim" title={item.path}>
                      {item.path}
                    </span>
                    <span className="shrink-0 text-ink-muted">
                      {item.state.type === 'excluded' ? item.state.reason : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
