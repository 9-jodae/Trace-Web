import type { DocumentDetail, UpdateAccessInput } from '@/entities/document'
import type { Clearance, Position } from '@/entities/user'

export interface AccessForm {
  clearance: Clearance
  /** 빈 배열 = 전체 부서 열람 */
  departmentIds: string[]
  minimumPosition: Position | null
  /** null이면 지정하지 않은 상태. 서버에 비우는 방법이 없어 보내지 않습니다. */
  ownerDepartmentId: string | null
}

/** 상세의 현재 값으로 폼을 채웁니다. 서버는 departmentIds·minimumPosition을 통째로 바꾸기 때문입니다. */
export function toAccessForm(detail: DocumentDetail): AccessForm {
  return {
    clearance: detail.document.clearance,
    departmentIds: [...detail.departmentIds],
    minimumPosition: detail.document.minimumPosition,
    ownerDepartmentId: detail.document.ownerDepartmentId,
  }
}

/** 요청 본문. 소유 부서는 값이 있을 때만 보내고, 생략하면 서버가 기존 값을 유지합니다. */
export function toUpdateAccessInput(form: AccessForm): UpdateAccessInput {
  const input: UpdateAccessInput = {
    clearance: form.clearance,
    departmentIds: form.departmentIds,
    minimumPosition: form.minimumPosition,
  }
  if (form.ownerDepartmentId) input.ownerDepartmentId = form.ownerDepartmentId
  return input
}
