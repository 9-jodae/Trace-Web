import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // 초기 뼈대 단계라 아직 한 곳에서만 쓰는 slice가 많음. 기능이 채워지면 다시 켜기
    rules: { 'fsd/insignificant-slice': 'off' },
  },
])
