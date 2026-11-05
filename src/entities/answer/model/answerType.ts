import type { AnswerSource } from './types'

/**
 * ⚠️ 임시 판별입니다("AI 응답 화면 표시 명세" 4절). answerType 필드 이름·값은 Server #76에서
 * 아직 합의 전이라 Spring이 전달하지 않습니다. 합의되어 QuestionResponse로 내려오면 이 함수 대신
 * answerType === 'NO_EVIDENCE'로 바로 분기하고, 이 파일은 지웁니다(전환 순서 4단계).
 *
 * 한계 2가지(문서에 명시됨, answerType 전환 전까지는 못 고칩니다):
 * - Spring이 권한으로 출처를 모두 걸러낸 ANSWER도 이 판별로는 못 걸러서 문장이 그대로 보입니다.
 * - 이 거절 문장이 바뀌면 이 판별이 깨집니다.
 */
export const NO_EVIDENCE_SENTENCE = '관련 문서를 찾지 못했습니다.'

export function isNoEvidenceAnswer(sources: AnswerSource[], text: string): boolean {
  return sources.length === 0 && text === NO_EVIDENCE_SENTENCE
}
