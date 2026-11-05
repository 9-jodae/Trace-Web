import clsx from 'clsx'
import { useEffect, useState, type ReactNode } from 'react'
import { SERVICE_NAME, serviceLogo } from '@/shared/brand'

/** 채팅 상대 이름. 사이드바 로고 옆 서비스 이름과 같습니다. */
const ASSISTANT_NAME = SERVICE_NAME

/** 답변·오류·입력 중 말풍선 공통 모양. 왼쪽 위 모서리만 작게 둬서 말꼬리처럼 보이게 합니다. */
export const assistantBubble = 'rounded-[18px] rounded-tl-md border px-4 py-3.5'

const timeFormat = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' })

/** 말풍선 옆에 붙는 보낸 시각("오후 2:14"). 시각을 모르면(옛 데이터 등) 그리지 않습니다. */
export function MessageTime({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return null
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null
  return (
    <time dateTime={createdAt} className="shrink-0 text-[11px] leading-4 text-ink-muted">
      {timeFormat.format(date)}
    </time>
  )
}

/**
 * 메신저처럼 왼쪽에 프로필, 오른쪽에 이름과 말풍선을 둡니다. 답변이 연달아 오면 첫 말풍선에만
 * 프로필과 이름을 보여주고, 나머지는 같은 너비만큼 비워 말풍선 줄을 맞춥니다.
 */
export function AssistantRow({
  showProfile,
  children,
}: {
  showProfile: boolean
  children: ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <div className="w-8 shrink-0">
        {showProfile && (
          <img
            src={serviceLogo}
            alt=""
            className="size-8 rounded-full bg-surface-raised ring-1 ring-border-dark"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {showProfile && (
          <p className="flex items-center gap-1.5 text-[13px] leading-5">
            <span className="font-semibold text-ink">{ASSISTANT_NAME}</span>
            <span className="text-xs text-ink-muted">사내 문서 기반 AI</span>
          </p>
        )}
        {children}
      </div>
    </div>
  )
}

/** 점 3개가 차례로 튀며 밝아지는 "입력 중" 표시. 애니메이션은 index.css의 typing-dot입니다. */
export function TypingDots({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      className={clsx('inline-flex items-center', size === 'md' ? 'gap-[5px]' : 'gap-[3px]')}
      aria-hidden
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={clsx(
            'typing-dot rounded-full bg-[#d9d5cc]',
            size === 'md' ? 'size-[7px]' : 'size-[5px]',
          )}
          style={{ animationDelay: `${index * 0.2}s` }}
        />
      ))}
    </span>
  )
}

/** 질문을 보낸 시각부터 센 경과 초. 패널이 다시 그려져도 처음부터 다시 세지 않습니다. */
function useElapsedSeconds(startedAt: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

const formatElapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** 답변을 기다리는 동안 상대 말풍선 자리에 보여줍니다. 경과 시간은 화면 낭독기가 매초 읽지 않게 숨깁니다. */
export function TypingIndicator({ startedAt }: { startedAt: number }) {
  const elapsed = useElapsedSeconds(startedAt)
  return (
    <div role="status" className="flex flex-col gap-1.5">
      <div
        className={clsx(
          assistantBubble,
          'flex w-fit items-center border-border-dark bg-[#1e1d1b] py-[17px]',
        )}
      >
        <TypingDots />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        근거를 찾고 답변을 만들고 있어요
        <span className="font-mono tabular-nums" aria-hidden>
          {formatElapsed(elapsed)}
        </span>
      </p>
      {elapsed >= 20 && <p className="text-xs text-ink-muted">최대 1분 정도 걸릴 수 있어요.</p>}
    </div>
  )
}

/** 디스코드처럼 입력창 바로 위에 "Trace가 답변을 생성 중…"을 띄웁니다. 대화 목록의 상태 문구와 겹쳐 낭독되지 않게 숨깁니다. */
export function TypingStatusBar() {
  return (
    <div className="flex items-center gap-2 px-7 pb-2 text-xs text-ink-dim" aria-hidden>
      <TypingDots size="sm" />
      <p>
        <span className="font-semibold text-ink">{ASSISTANT_NAME}</span>가 답변을 생성 중…
      </p>
    </div>
  )
}
