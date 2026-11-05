import { useQuery } from '@tanstack/react-query'
import { request } from '@/shared/api'
import type { Department } from '../model/types'

export const departmentKeys = {
  all: ['department', 'list'] as const,
}

export function listDepartments() {
  return request<Department[]>({ method: 'GET', url: '/api/departments' })
}

export function useDepartments() {
  return useQuery({ queryKey: departmentKeys.all, queryFn: listDepartments })
}
