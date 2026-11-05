import { vi } from 'vitest'

/**
 * 테스트 전용: jsdom에 없는 URL.createObjectURL·revokeObjectURL을 대신하고, 내려받기 링크 클릭을 가로챕니다.
 * `saved`에 내려받은 파일 이름과 Blob이 쌓이며, 반환한 restore로 원래대로 되돌립니다.
 */
export function stubDownload() {
  const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
  const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
  const blobs = new Map<string, Blob>()
  const saved: { fileName: string; blob: Blob | undefined }[] = []
  let count = 0

  const createObjectURL = vi.fn<(blob: Blob) => string>((blob) => {
    count += 1
    const url = `blob:test/${count}`
    blobs.set(url, blob)
    return url
  })
  const revokeObjectURL = vi.fn<(url: string) => void>((url) => {
    blobs.delete(url)
  })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })

  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({ fileName: this.download, blob: blobs.get(this.href) })
  })

  return {
    saved,
    createObjectURL,
    revokeObjectURL,
    restore() {
      click.mockRestore()
      for (const [key, descriptor] of [
        ['createObjectURL', originalCreate],
        ['revokeObjectURL', originalRevoke],
      ] as const) {
        if (descriptor) Object.defineProperty(URL, key, descriptor)
        else Reflect.deleteProperty(URL, key)
      }
    },
  }
}
