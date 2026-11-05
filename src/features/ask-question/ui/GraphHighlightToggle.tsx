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
      className="flex h-11 items-center gap-2.5 rounded-[22px] px-2.5 text-[13px] text-ink-dim hover:bg-white/5"
    >
      <span
        className={`relative h-5 w-[34px] rounded-full transition-colors ${enabled ? 'bg-ink' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-[#111110] transition-transform ${
            enabled ? 'translate-x-[16px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      관계 그래프
    </button>
  )
}
