/** 내려받기가 시작될 때까지 임시 URL을 남겨 두는 시간. 바로 해제하면 일부 브라우저에서 받기가 실패합니다. */
const REVOKE_DELAY_MS = 60_000

/**
 * 메모리에 받은 파일을 사용자 컴퓨터에 저장합니다.
 * 새 창으로 열지 않고 내려받기만 하므로 파일 내용이 이 사이트 출처에서 실행되지 않습니다.
 */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
