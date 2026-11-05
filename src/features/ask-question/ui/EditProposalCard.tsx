import { useState } from 'react'
import type { AnswerEditProposal } from '@/entities/answer'
import { downloadDocument, isLocalEditMode, useLocalEditStore } from '@/entities/document'
import { toErrorMessage } from '@/shared/api'
import { buttonPrimary, buttonSecondary } from '@/shared/ui'

type Decision = 'pending' | 'applying' | 'applied' | 'kept'

/** LLM이 제안한 수정 한 건. 적용은 사용자가 고르며, 고르기 전에는 문서를 바꾸지 않습니다. */
export function EditProposalCard({ proposal }: { proposal: AnswerEditProposal }) {
  const [decision, setDecision] = useState<Decision>('pending')
  const [error, setError] = useState<string | null>(null)
  const saveEdit = useLocalEditStore((state) => state.saveEdit)
  const localMode = isLocalEditMode()

  const apply = async () => {
    setError(null)
    setDecision('applying')
    try {
      const saved = useLocalEditStore.getState().edits[proposal.documentId]?.text
      const text = saved ?? (await (await downloadDocument(proposal.documentId)).text())
      // 그사이 문서가 바뀌었거나 같은 문장이 여럿이면 어디를 고칠지 알 수 없습니다.
      if (text.split(proposal.before).length !== 2) {
        setError('문서 내용이 바뀌어 적용할 수 없습니다')
        setDecision('pending')
        return
      }
      saveEdit(proposal.documentId, {
        title: proposal.source,
        text: text.replace(proposal.before, () => proposal.after),
        resolved: true,
      })
      setDecision('applied')
    } catch (failure) {
      setError(toErrorMessage(failure))
      setDecision('pending')
    }
  }

  return (
    <article
      aria-label={`수정 제안: ${proposal.source}`}
      className="flex flex-col gap-2 rounded-[10px] border border-border-dark-strong p-3 text-sm"
    >
      <header className="flex items-center gap-2 text-ink">
        <span className="font-semibold">{proposal.source}</span>
        {proposal.sample && <span className="text-xs text-amber-300">샘플 제안</span>}
      </header>
      <p className="text-ink-muted line-through">{proposal.before}</p>
      <p className="text-ink">{proposal.after}</p>
      {proposal.reason && <p className="text-xs text-ink-dim">{proposal.reason}</p>}
      {decision === 'applied' && (
        <p role="status" className="text-xs text-emerald-300">
          변경했습니다. 로컬 시험이라 서버 문서는 그대로이고, 새로고침하면 돌아갑니다.
        </p>
      )}
      {decision === 'kept' && (
        <p role="status" className="text-xs text-ink-dim">
          유지했습니다. 문서를 바꾸지 않았습니다.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      {!localMode && (
        <p className="text-xs text-ink-dim">문서 저장 연결 전이라 아직 적용할 수 없습니다.</p>
      )}
      {(decision === 'pending' || decision === 'applying') && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void apply()}
            disabled={!localMode || decision === 'applying'}
            className={buttonPrimary}
          >
            변경
          </button>
          <button
            type="button"
            onClick={() => setDecision('kept')}
            disabled={decision === 'applying'}
            className={buttonSecondary}
          >
            유지
          </button>
        </div>
      )}
    </article>
  )
}
