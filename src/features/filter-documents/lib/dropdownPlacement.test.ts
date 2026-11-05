import { describe, expect, it } from 'vitest'
import { placeDropdown } from './dropdownPlacement'

describe('placeDropdown', () => {
  it('아래에 내용이 다 들어가면 아래로 펼친다', () => {
    expect(
      placeDropdown({ anchor: { top: 60, bottom: 100 }, contentHeight: 300, viewportHeight: 800 }),
    ).toEqual({ side: 'bottom', maxHeight: 688 })
  })

  it('아래가 모자라고 위가 더 넓으면 위로 펼치고 위쪽 공간에 맞춘다', () => {
    // 1366x657 노트북 화면에서 홈 입력창의 "필터" 버튼 위치
    expect(
      placeDropdown({ anchor: { top: 388, bottom: 428 }, contentHeight: 380, viewportHeight: 657 }),
    ).toEqual({ side: 'top', maxHeight: 376 })
  })

  it('아래가 모자라도 위가 더 좁으면 아래로 펼치고 패널 안에서 스크롤한다', () => {
    expect(
      placeDropdown({ anchor: { top: 100, bottom: 140 }, contentHeight: 600, viewportHeight: 500 }),
    ).toEqual({ side: 'bottom', maxHeight: 348 })
  })

  it('남은 공간이 아주 작아도 최소 높이는 보장한다', () => {
    expect(
      placeDropdown({ anchor: { top: 50, bottom: 90 }, contentHeight: 400, viewportHeight: 150 }),
    ).toEqual({ side: 'bottom', maxHeight: 160 })
  })
})
