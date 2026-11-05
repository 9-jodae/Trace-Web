import type { AnswerEditProposal } from '@/entities/answer'
import { downloadDocument, fetchAllDocuments } from '@/entities/document'

const EDIT_REQUEST = /(수정|고쳐|맞춰|통일|변경|해결)/
const TARGET_TITLE = 'leave-operation'
export function isSampleEditRequest(question: string) {
  return EDIT_REQUEST.test(question)
}

/**
 * 개발 서버에서 카드 화면을 확인하기 위한 고정 샘플입니다. 이번 검색 결과와 무관하게 볼 수 있는 문서에서
 * 대상을 찾습니다. 서버가 editProposals를 전달하면 지웁니다.
 */
export async function sampleEditProposals(): Promise<AnswerEditProposal[]> {
  const documents = await fetchAllDocuments()
  const target = documents.find((document) => document.title === TARGET_TITLE)
  if (!target) return []
  // 문서 내용을 코드에 두지 않도록 대상 문장은 원문에서 찾습니다.
  const text = await (await downloadDocument(target.id)).text()
  const before = text
    .split('\n')
    .find((line) => line.includes('최대 7일'))
    ?.trim()
  if (!before) return []
  return [
    {
      chunkId: `sample-${target.id}`,
      source: target.title,
      documentId: target.id,
      before,
      after: before.replace('최대 7일', '최대 5일').replace('6월 30일', '3월 31일'),
      reason: '요청한 기준(최대 5일, 다음 해 3월 31일)에 맞춥니다.',
      sample: true,
    },
  ]
}
