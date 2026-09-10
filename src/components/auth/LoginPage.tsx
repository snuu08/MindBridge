import { useState } from 'react'
import { authErrorMessage } from '../../lib/authErrors.ts'
import { isSupabaseConfigured, supabase } from '../../lib/supabase.ts'
import styles from './AuthScreen.module.css'

interface LoginPageProps {
  onGoSignup: () => void
  onForgotPassword: () => void
  notice?: string
}

export function LoginPage({ onGoSignup, onForgotPassword, notice }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.logo}>MindBridge</h1>
        <p className={styles.lead}>이메일과 비밀번호로 로그인하세요.</p>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            if (!email.trim() || !password) {
              setError('이메일과 비밀번호를 입력하세요.')
              return
            }
            if (!isSupabaseConfigured()) {
              setError('Supabase 설정이 없습니다. 환경 변수를 확인하세요.')
              return
            }
            setError('')
            setPending(true)
            void supabase.auth
              .signInWithPassword({
                email: email.trim(),
                password,
              })
              .then(({ error: authError }) => {
                if (authError) setError(authErrorMessage(authError))
              })
              .finally(() => setPending(false))
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              이메일
            </label>
            <input
              id="login-email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              disabled={pending}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              비밀번호
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={pending}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
            />
          </div>
          <p className={styles.forgot}>
            <button
              type="button"
              className={styles.link}
              onClick={onForgotPassword}
              disabled={pending}
            >
              비밀번호를 잊으셨나요?
            </button>
          </p>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <p className={styles.switch}>
          계정이 없나요?{' '}
          <button type="button" className={styles.link} onClick={onGoSignup} disabled={pending}>
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
