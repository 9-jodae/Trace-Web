import { useState, type FormEvent } from 'react'
import { clsx } from 'clsx'
import { TriangleAlert } from 'lucide-react'
import { ApiRequestError, toErrorMessage } from '@/shared/api'
import { useLogin } from '../model/session'

const inputClass =
  'h-[46px] w-full rounded-xl border bg-surface px-3.5 text-sm text-[#e8e6e1] outline-none placeholder:text-ink-muted focus:border-white/30'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate, isPending, error } = useLogin()
  // 로그인 요청의 401은 만료가 아니라 아이디(이메일)·비밀번호 불일치입니다.
  const invalidCredentials = error instanceof ApiRequestError && error.status === 401

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) return
    mutate({ email: email.trim(), password }, { onSuccess })
  }

  return (
    <form onSubmit={submit} className="mt-1 flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-dim">
        아이디
        {/* 서버 로그인 계약은 이메일이라 입력 형식은 이메일로 둡니다. */}
        <input
          type="email"
          autoComplete="username"
          required
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={clsx(inputClass, 'border-white/12')}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-dim">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={invalidCredentials || undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={clsx(
              inputClass,
              invalidCredentials ? 'border-[#f08a8a]/60' : 'border-white/12',
            )}
          />
        </label>
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-[#f08a8a]">
            <TriangleAlert aria-hidden="true" className="size-[13px] shrink-0" strokeWidth={2.25} />
            {invalidCredentials ? '아이디 또는 비밀번호가 올바르지 않아요' : toErrorMessage(error)}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-full bg-ink text-[15px] font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? '로그인 중…' : '로그인'}
      </button>
    </form>
  )
}
