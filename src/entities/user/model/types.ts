// docs199-Server의 UserResponse(GET /api/users/me)와 enum에 맞춥니다.

export type Role = 'EMPLOYEE' | 'DOC_ADMIN' | 'SYSTEM_ADMIN'

/** 직급. STAFF < SENIOR < MANAGER < DIRECTOR */
export type Position = 'STAFF' | 'SENIOR' | 'MANAGER' | 'DIRECTOR'

/** 보안 등급. PUBLIC < INTERNAL < CONFIDENTIAL */
export type Clearance = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'

export interface User {
  id: string
  email: string
  name: string
  departmentId: string
  department: string
  position: Position
  role: Role
  clearance: Clearance
}
