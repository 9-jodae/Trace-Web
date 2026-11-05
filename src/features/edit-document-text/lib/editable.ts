/** 브라우저에서 글자로 읽고 같은 형식으로 다시 저장할 수 있는 형식입니다. PDF는 서버 지원이 필요합니다. */
const TEXT_EXTENSIONS = new Set(['md', 'txt'])

export function isTextEditable(extension: string) {
  return TEXT_EXTENSIONS.has(extension.replace(/^\./, '').toLowerCase())
}
