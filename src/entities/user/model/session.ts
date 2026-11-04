import { create } from 'zustand'
import type { User } from './types'

interface SessionState {
  user: User | null
  setUser: (user: User | null) => void
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
