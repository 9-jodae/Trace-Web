import type { Clearance, Position } from '@/entities/user/@x/document'

export const CLEARANCE_LABEL: Record<Clearance, string> = {
  PUBLIC: '공개',
  INTERNAL: '사내',
  CONFIDENTIAL: '기밀',
}

export const CLEARANCE_OPTIONS = Object.keys(CLEARANCE_LABEL) as Clearance[]

/**
 * 직급 표시명. 서버 시연 계정 이름(사원·팀장·부장)에 맞췄고, SENIOR의 표시명은 확정되지 않았습니다
 * (docs/architecture.md "결정 필요").
 */
export const POSITION_LABEL: Record<Position, string> = {
  STAFF: '사원',
  SENIOR: '선임',
  MANAGER: '팀장',
  DIRECTOR: '부장',
}

export const POSITION_OPTIONS = Object.keys(POSITION_LABEL) as Position[]

export function clearanceLabel(clearance: string): string {
  return CLEARANCE_LABEL[clearance as Clearance] ?? clearance
}

export function positionLabel(position: string | null): string {
  if (position === null) return '—'
  return POSITION_LABEL[position as Position] ?? position
}
