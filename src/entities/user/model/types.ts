export type Department = string
export type Rank = string
export type Role = 'member' | 'admin'

export interface User {
  id: string
  name: string
  department: Department
  rank: Rank
  role: Role
}
