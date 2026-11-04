export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx', 'md'] as const
export type FileExtension = (typeof SUPPORTED_EXTENSIONS)[number]

export const DOCUMENT_TYPES = ['인수인계', '결재', '보고서', '발표', '기타'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const SECURITY_LEVELS = ['일반', '대외비', '기밀'] as const
export type SecurityLevel = (typeof SECURITY_LEVELS)[number]
