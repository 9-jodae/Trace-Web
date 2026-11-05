// 업로드 미리 거르기 기준. 서버 기본값(docs199-Server docs/document-management.md)과 맞춥니다.

/** 업로드할 수 있는 확장자(소문자). 서버 ALLOWED_EXTENSIONS 기본값 */
export const ALLOWED_EXTENSIONS = ['pdf', 'md'] as const

/** 파일 하나의 최대 크기(20MB). 서버 MAX_UPLOAD_FILE_SIZE 기본값 */
export const MAX_FILE_BYTES = 20 * 1024 * 1024

/** 요청 하나에 담을 파일 크기 합의 상한(90MB). 서버 요청 한도 100MB에서 multipart 여유분을 뺐습니다. */
export const MAX_BATCH_BYTES = 90 * 1024 * 1024

/** 요청 하나에 담을 파일 수 상한 */
export const MAX_BATCH_FILES = 50

/** 업로드·개정 요청의 시간 한도(5분). 기본 30초로는 큰 묶음이 끝나기 전에 끊깁니다. */
export const UPLOAD_TIMEOUT_MS = 300_000
