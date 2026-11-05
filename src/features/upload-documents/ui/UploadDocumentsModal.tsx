import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { UploadOptions } from '@/entities/document'
import type { Source } from '@/entities/source'
import { buttonPrimary, buttonSecondary, Modal } from '@/shared/ui'
import { useUploadSession } from '../model/useUploadSession'
import { OptionsStep } from './OptionsStep'
import { PickStep } from './PickStep'
import { ResultStep } from './ResultStep'

/**
 * 업로드 모달. 파일 고르기 → 권한과 정보 → 전송(묶음 단위 순차) → 결과 순서로 진행합니다.
 * 전송 중에는 닫을 수 없습니다.
 */
export function UploadDocumentsModal({ source, onClose }: { source: Source; onClose: () => void }) {
  const session = useUploadSession(source.id)
  const [options, setOptions] = useState<UploadOptions>(() => ({
    clearance: source.defaultClearance,
    departmentIds: [],
    minimumPosition: null,
    ownerDepartmentId: source.defaultDepartmentId,
    author: null,
    authoredAt: null,
  }))
  const [closeBlocked, setCloseBlocked] = useState(false)

  const sendableCount = session.items.filter((item) => item.state.type !== 'excluded').length
  const failedCount = session.items.filter((item) => item.state.type === 'failed').length

  const requestClose = () => {
    if (session.phase === 'sending') {
      setCloseBlocked(true)
      return
    }
    onClose()
  }

  const footer =
    session.phase === 'pick' ? (
      <>
        <button type="button" onClick={onClose} className={buttonSecondary}>
          취소
        </button>
        <button
          type="button"
          disabled={sendableCount === 0}
          onClick={session.toOptions}
          className={buttonPrimary}
        >
          다음
        </button>
      </>
    ) : session.phase === 'options' ? (
      <>
        <button type="button" onClick={session.backToPick} className={buttonSecondary}>
          이전
        </button>
        <button type="button" onClick={() => void session.start(options)} className={buttonPrimary}>
          파일 {sendableCount}개 업로드
        </button>
      </>
    ) : session.phase === 'done' ? (
      <>
        {failedCount > 0 && (
          <button
            type="button"
            onClick={() => void session.retryFailed()}
            className={buttonSecondary}
          >
            실패한 파일만 다시 보내기
          </button>
        )}
        <button type="button" onClick={onClose} className={buttonPrimary}>
          닫기
        </button>
      </>
    ) : null

  return (
    <Modal title={`업로드 · ${source.name}`} onClose={requestClose} footer={footer} wide>
      {session.phase === 'pick' && <PickStep items={session.items} onPick={session.pick} />}
      {session.phase === 'options' && (
        <OptionsStep source={source} value={options} onChange={setOptions} />
      )}
      {session.phase === 'sending' && (
        <div className="flex flex-col items-center gap-3 py-10 text-sm">
          <Loader2 className="size-6 animate-spin text-ink-dim" aria-hidden />
          <p aria-live="polite">
            {session.progress
              ? `묶음 ${session.progress.batch}/${session.progress.batchCount} 전송 중 · 파일 ${session.progress.filesDone}/${session.progress.filesTotal}`
              : '전송 준비 중…'}
          </p>
          {closeBlocked && (
            <p role="alert" className="text-xs text-amber-300">
              전송 중에는 닫을 수 없습니다
            </p>
          )}
        </div>
      )}
      {session.phase === 'done' && <ResultStep items={session.items} />}
    </Modal>
  )
}
