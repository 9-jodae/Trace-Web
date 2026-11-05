import { useState, type FormEvent } from 'react'
import { ApiRequestError, toErrorMessage } from '@/shared/api'
import { useLogin } from '../model/session'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate, isPending, error } = useLogin()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) return
    mutate({ email: email.trim(), password }, { onSuccess })
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        이메일
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비밀번호
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {loginErrorMessage(error)}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? '로그인 중…' : '로그인'}
      </button>
    </form>
  )
}

function loginErrorMessage(error: unknown) {
  // 로그인 요청의 401은 만료가 아니라 이메일·비밀번호 불일치입니다.
  if (error instanceof ApiRequestError && error.status === 401) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  return toErrorMessage(error)
}
