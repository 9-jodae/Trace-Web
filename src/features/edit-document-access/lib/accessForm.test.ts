import { describe, expect, it } from 'vitest'
import type { DocumentDetail } from '@/entities/document'
import { toAccessForm, toUpdateAccessInput } from './accessForm'

const detail = (ownerDepartmentId: string | null) =>
  ({
    document: { clearance: 'INTERNAL', minimumPosition: 'MANAGER', ownerDepartmentId },
    departmentIds: ['dep2'],
    versions: [],
    job: null,
  }) as unknown as DocumentDetail

describe('권한 수정 폼', () => {
  it('상세의 현재 값으로 채운다', () => {
    expect(toAccessForm(detail('dep1'))).toEqual({
      clearance: 'INTERNAL',
      departmentIds: ['dep2'],
      minimumPosition: 'MANAGER',
      ownerDepartmentId: 'dep1',
    })
  })

  it('전체 값을 보내고 소유 부서가 없으면 생략한다', () => {
    expect(toUpdateAccessInput(toAccessForm(detail(null)))).toEqual({
      clearance: 'INTERNAL',
      departmentIds: ['dep2'],
      minimumPosition: 'MANAGER',
    })
    expect(toUpdateAccessInput(toAccessForm(detail('dep1')))).toHaveProperty(
      'ownerDepartmentId',
      'dep1',
    )
  })

  it('최소 직급을 비우면 null로 보내 제한을 없앤다', () => {
    const form = { ...toAccessForm(detail('dep1')), minimumPosition: null, departmentIds: [] }
    expect(toUpdateAccessInput(form)).toMatchObject({ minimumPosition: null, departmentIds: [] })
  })
})
