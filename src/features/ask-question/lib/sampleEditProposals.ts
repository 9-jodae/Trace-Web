import type { AnswerEditProposal } from '@/entities/answer'
import { fetchAllDocuments } from '@/entities/document'

const EDIT_REQUEST = /(수정|고쳐|맞춰|통일|변경|해결)/
const TARGET_TITLE = 'leave-operation'
const BEFORE =
  '인사팀 정산 시 미사용 연차는 다음 연도로 최대 7일 이월한다. 이월분은 다음 해 6월 30일까지 사용한다.'
const AFTER =
  '인사팀 정산 시 미사용 연차는 다음 연도로 최대 5일 이월한다. 이월분은 다음 해 3월 31일까지 사용한다.'

export function isSampleEditRequest(question: string) {
  return EDIT_REQUEST.test(question)
}

/**
 * 개발 서버에서 카드 화면을 확인하기 위한 고정 샘플입니다. 이번 검색 결과와 무관하게 볼 수 있는 문서에서
 * 대상을 찾으며, 문장이 실제로 있는지는 적용할 때 확인합니다. 서버가 editProposals를 전달하면 지웁니다.
 */
export async function sampleEditProposals(): Promise<AnswerEditProposal[]> {
  const documents = await fetchAllDocuments()
  const target = documents.find((document) => document.title === TARGET_TITLE)
  if (!target) return []
  return [
    {
      chunkId: `sample-${target.id}`,
      source: target.title,
      documentId: target.id,
      before: BEFORE,
      after: AFTER,
      reason: '요청한 기준(최대 5일, 다음 해 3월 31일)에 맞춥니다.',
      sample: true,
    },
  ]
}
