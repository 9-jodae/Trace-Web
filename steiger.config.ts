import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // 초기에는 슬라이스마다 사용처가 하나뿐이라 경고가 나므로, 화면이 늘어난 뒤 다시 켭니다.
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },
])
