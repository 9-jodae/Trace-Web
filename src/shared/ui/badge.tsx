import type { PropsWithChildren } from 'react'

export function Badge({ children }: PropsWithChildren) {
  return <span style={{ padding: '2px 6px', borderRadius: 4, background: '#eee' }}>{children}</span>
}
