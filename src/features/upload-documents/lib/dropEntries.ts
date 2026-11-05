import type { PickedFile } from './items'

function readFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

function readBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject))
}

async function walk(entry: FileSystemEntry, fromFolder: boolean, out: PickedFile[]) {
  if (entry.isFile) {
    const file = await readFile(entry as FileSystemFileEntry)
    out.push({ file, rawPath: entry.fullPath, fromFolder })
    return
  }
  if (!entry.isDirectory) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  // readEntries는 한 번에 일부만 주므로 빈 배열이 올 때까지 반복합니다.
  for (;;) {
    const children = await readBatch(reader)
    if (children.length === 0) return
    for (const child of children) await walk(child, fromFolder, out)
  }
}

/**
 * 드롭한 파일·폴더를 펼칩니다. 폴더를 드롭하면 폴더 선택과 같은 경로 규칙을 씁니다.
 * DataTransfer 항목은 이벤트 처리가 끝나면 무효가 되므로 항목은 먼저 동기적으로 꺼냅니다.
 */
export function filesFromDrop(dataTransfer: DataTransfer): Promise<PickedFile[]> {
  const entries = Array.from(dataTransfer.items)
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry !== null)
  const plainFiles = Array.from(dataTransfer.files)

  return (async () => {
    if (entries.length === 0) {
      return plainFiles.map((file) => ({ file, rawPath: file.name, fromFolder: false }))
    }
    const out: PickedFile[] = []
    for (const entry of entries) await walk(entry, entry.isDirectory, out)
    return out
  })()
}
