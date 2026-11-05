import { QueryClient } from '@tanstack/react-query'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { file as fileReply, mockServer, ok } from '@/shared/testing'
import {
  adminDeleteDocument,
  adminDownloadDocument,
  adminReviseDocument,
  adminUpdateAccess,
  adminUploadDocuments,
  adminDocumentKeys,
  buildUploadForm,
  invalidateAfterDocumentChange,
  isNewVersion,
} from './adminDocumentApi'
import { documentKeys } from './documentApi'

let restore: () => void = () => {}

const file = (name: string) => new File(['x'], name)

describe('buildUploadForm', () => {
  it('files와 paths를 같은 순서로 반복하고 비어 있는 선택 값은 보내지 않는다', () => {
    const form = buildUploadForm(
      [
        { file: file('a.md'), path: '공통/a.md' },
        { file: file('b.pdf'), path: 'b.pdf' },
      ],
      {
        clearance: 'INTERNAL',
        departmentIds: [],
        minimumPosition: null,
        ownerDepartmentId: null,
        author: '  ',
        authoredAt: null,
      },
    )
    expect(form.getAll('paths')).toEqual(['공통/a.md', 'b.pdf'])
    expect((form.getAll('files') as File[]).map((item) => item.name)).toEqual(['a.md', 'b.pdf'])
    expect(form.get('clearance')).toBe('INTERNAL')
    for (const key of [
      'departmentIds',
      'minimumPosition',
      'ownerDepartmentId',
      'author',
      'authoredAt',
    ]) {
      expect(form.has(key)).toBe(false)
    }
  })

  it('선택한 값은 모두 보낸다', () => {
    const form = buildUploadForm([{ file: file('a.md'), path: 'a.md' }], {
      clearance: 'CONFIDENTIAL',
      departmentIds: ['d1', 'd2'],
      minimumPosition: 'MANAGER',
      ownerDepartmentId: 'd1',
      author: ' 정서윤 ',
      authoredAt: '2026-11-01',
    })
    expect(form.getAll('departmentIds')).toEqual(['d1', 'd2'])
    expect(form.get('minimumPosition')).toBe('MANAGER')
    expect(form.get('ownerDepartmentId')).toBe('d1')
    expect(form.get('author')).toBe('정서윤')
    expect(form.get('authoredAt')).toBe('2026-11-01')
  })
})

describe('관리자 문서 API', () => {
  afterEach(() => restore())

  it('경로·메서드와 업로드 시간 한도를 맞춰 호출한다', async () => {
    const calls: InternalAxiosRequestConfig[] = []
    restore = mockServer((config) => {
      calls.push(config)
      return ok(null)
    })
    const options = {
      clearance: 'PUBLIC' as const,
      departmentIds: [],
      minimumPosition: null,
      ownerDepartmentId: null,
      author: null,
      authoredAt: null,
    }

    await adminUploadDocuments('s/1', [{ file: file('a.md'), path: 'a.md' }], options)
    await adminReviseDocument('d1', { file: file('a.md'), author: null, authoredAt: '2026-11-02' })
    await adminUpdateAccess('d1', { clearance: 'PUBLIC', departmentIds: [], minimumPosition: null })
    await adminDeleteDocument('d1')

    expect(calls.map((call) => `${call.method?.toUpperCase()} ${call.url}`)).toEqual([
      'POST /api/admin/sources/s%2F1/documents',
      'POST /api/admin/documents/d1/revisions',
      'PATCH /api/admin/documents/d1/access',
      'DELETE /api/admin/documents/d1',
    ])
    expect(calls[0]?.timeout).toBe(300_000)
    expect(calls[1]?.timeout).toBe(300_000)
    expect((calls[1]?.data as FormData).get('authoredAt')).toBe('2026-11-02')
  })

  it('원문은 관리자 다운로드 경로에서 Blob으로 받는다', async () => {
    const calls: InternalAxiosRequestConfig[] = []
    restore = mockServer((config) => {
      calls.push(config)
      return fileReply('관리자 원문')
    })

    const blob = await adminDownloadDocument('d/1')

    expect(await blob.text()).toBe('관리자 원문')
    expect(calls[0]?.url).toBe('/api/admin/documents/d%2F1/download')
    expect(calls[0]?.responseType).toBe('blob')
  })
})

describe('isNewVersion', () => {
  const result = (outcome: string, version: number | null) => ({
    path: 'a.md',
    documentId: 'd1',
    version,
    outcome,
    reason: null,
  })

  it('UPDATED이거나 버전이 2 이상인 CREATED를 새 버전으로 본다', () => {
    expect(isNewVersion(result('UPDATED', 2))).toBe(true)
    expect(isNewVersion(result('CREATED', 2))).toBe(true)
    expect(isNewVersion(result('CREATED', 1))).toBe(false)
    expect(isNewVersion(result('UNCHANGED', 3))).toBe(false)
  })
})

describe('invalidateAfterDocumentChange', () => {
  it('관리 화면뿐 아니라 문서 탭의 상세·상태와 그래프 목록도 새로 받게 한다', async () => {
    const client = new QueryClient()
    const keys = [
      adminDocumentKeys.detail('d1'),
      documentKeys.everyAccessible,
      documentKeys.detail('d1'),
      documentKeys.status('d1'),
    ]
    for (const key of keys) client.setQueryData(key, {})

    await invalidateAfterDocumentChange(client)

    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  })
})
