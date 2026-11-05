import { clsx } from 'clsx'
import { useChatStore } from '../model/chatStore'

/** 꺼두면 근거 강조를 그래프에 반영하지 않습니다(기획서 디자인의 "관계 그래프" 토글). */
export function GraphHighlightToggle() {
  const enabled = useChatStore((state) => state.graphHighlightEnabled)
  const toggle = useChatStore((state) => state.toggleGraphHighlight)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      className="flex h-11 shrink-0 items-center gap-2.5 rounded-[22px] px-2.5 text-[13px] whitespace-nowrap text-ink-dim hover:bg-white/5"
    >
      <span
        className={clsx(
          'relative h-5 w-[34px] shrink-0 rounded-full transition-colors',
          enabled ? 'bg-ink' : 'bg-white/15',
        )}
      >
        {/* left-0이 없으면 버튼의 text-align: center 때문에 손잡이가 트랙 가운데에서 시작해 밖으로 밀려납니다. */}
        <span
          className={clsx(
            'absolute top-0.5 left-0 size-4 rounded-full bg-[#111110] transition-transform',
            enabled ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
      관계 그래프
    </button>
  )
}
