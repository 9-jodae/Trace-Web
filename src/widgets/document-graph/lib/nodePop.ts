/** 노드마다 등장 시작을 흩어 두는 범위(ms). 이 안에서 하나씩 튀어나옵니다. */
export const POP_SPREAD_MS = 900
/** 노드 하나가 커지는 시간(ms). */
export const POP_MS = 320
export const POP_TOTAL_MS = POP_SPREAD_MS + POP_MS

/** 같은 노드는 언제나 같은 순서로 나오게 ID로 지연을 정합니다. */
export function popDelay(nodeId: string) {
  let hash = 0
  for (let index = 0; index < nodeId.length; index += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(index)) >>> 0
  }
  return hash % POP_SPREAD_MS
}

/** 조금 크게 튀었다가 제자리로 돌아오는 곡선. 0에서 시작해 1에서 끝납니다. */
function easeOutBack(t: number) {
  const overshoot = 1.70158
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2
}

/** 등장 시작 뒤 지난 시간에 따른 노드 크기 배율(0~1.1 남짓). */
export function popScale(elapsedMs: number, delayMs: number) {
  const t = (elapsedMs - delayMs) / POP_MS
  if (t <= 0) return 0
  if (t >= 1) return 1
  return easeOutBack(t)
}
