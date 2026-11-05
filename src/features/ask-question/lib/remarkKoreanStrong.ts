interface MarkdownNode {
  type: string
  value?: string
  children?: MarkdownNode[]
}

const STRONG = /\*\*([^*\n]+?)\*\*/g

function split(value: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = []
  let last = 0
  for (const match of value.matchAll(STRONG)) {
    if (match.index > last) nodes.push({ type: 'text', value: value.slice(last, match.index) })
    nodes.push({ type: 'strong', children: [{ type: 'text', value: match[1] ?? '' }] })
    last = match.index + match[0].length
  }
  if (last === 0) return [{ type: 'text', value }]
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) })
  return nodes
}

function visit(node: MarkdownNode) {
  if (!node.children) return
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text' && child.value?.includes('**')) return split(child.value)
    visit(child)
    return [child]
  })
}

/**
 * CommonMark는 `**12%**를`처럼 문장 부호 뒤에 한글 조사가 붙으면 굵게로 읽지 않아 별표가 그대로 보입니다.
 * 파서가 글자로 남긴 짝만 굵게로 바꿉니다. 코드 안의 별표는 글자 노드가 아니라 건드리지 않습니다.
 */
export function remarkKoreanStrong() {
  return visit
}
