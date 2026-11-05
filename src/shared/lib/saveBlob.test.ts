import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubDownload } from '@/shared/testing'
import { saveBlob } from './saveBlob'

describe('saveBlob', () => {
  let download: ReturnType<typeof stubDownload> | undefined

  afterEach(() => {
    download?.restore()
    vi.useRealTimers()
  })

  it('임시 URL로 파일 이름을 붙여 내려받고, 링크를 남기지 않으며 나중에 URL을 해제한다', () => {
    vi.useFakeTimers()
    download = stubDownload()
    const blob = new Blob(['내용'])

    saveBlob(blob, '연차 규정.pdf')

    expect(download.saved).toEqual([{ fileName: '연차 규정.pdf', blob }])
    expect(document.querySelector('a[download]')).toBeNull()
    expect(download.revokeObjectURL).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:test/1')
  })
})
