export interface DropdownPlacement {
  /** 패널을 버튼 아래(bottom)로 펼칠지 위(top)로 펼칠지 */
  side: 'top' | 'bottom'
  /** 화면 밖으로 넘치지 않는 패널 최대 높이(px). 내용이 더 길면 패널 안에서 스크롤합니다. */
  maxHeight: number
}

/** 버튼과 패널 사이 간격(mt-1/mb-1)과 화면 가장자리 여백 */
const GAP = 4
const VIEWPORT_MARGIN = 8
/** 남은 공간이 이보다 작아도 최소한 이만큼은 보여줍니다. */
const MIN_HEIGHT = 160

/**
 * 필터 패널을 펼칠 방향과 최대 높이를 정합니다. 노트북처럼 세로가 짧은 화면에서 홈 입력창 아래로
 * 패널을 펼치면 화면 밖으로 잘리므로, 아래에 다 들어가지 않고 위쪽 공간이 더 넓으면 위로 펼칩니다.
 */
export function placeDropdown({
  anchor,
  contentHeight,
  viewportHeight,
}: {
  anchor: { top: number; bottom: number }
  contentHeight: number
  viewportHeight: number
}): DropdownPlacement {
  const below = viewportHeight - anchor.bottom - GAP - VIEWPORT_MARGIN
  const above = anchor.top - GAP - VIEWPORT_MARGIN
  const side = contentHeight <= below || below >= above ? 'bottom' : 'top'
  const space = side === 'bottom' ? below : above
  return { side, maxHeight: Math.max(MIN_HEIGHT, Math.floor(space)) }
}
