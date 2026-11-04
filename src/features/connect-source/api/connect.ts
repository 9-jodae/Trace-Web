import { http } from '@/shared/api'
import type { Source, SourceKind } from '@/entities/source'

export type ConnectPayload =
  | { kind: Extract<SourceKind, 'notion'>; token: string; pageIds: string[] }
  | { kind: Extract<SourceKind, 'obsidian'>; vaultPath: string } // .obsidian, .trash 자동 제외
  | { kind: Extract<SourceKind, 'local'>; rootPath: string }

export const connectSource = (payload: ConnectPayload) =>
  http<Source>('/sources', { method: 'POST', body: JSON.stringify(payload) })
