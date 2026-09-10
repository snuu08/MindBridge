import { useState } from 'react'
import { authErrorMessage } from '../../lib/authErrors.ts'
import { isSupabaseConfigured, supabase } from '../../lib/supabase.ts'
import styles from './AuthScreen.module.css'

interface SignupPageProps {
  onGoLogin: () => void
  onSignedUp: (detail: { needsEmailConfirm: boolean }) => void
}

export function SignupPage({ onGoLogin, onSignedUp }: SignupPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.logo}>MindBridge</h1>
        <p className={styles.lead}>계정을 만든 뒤 로그인해 주세요.</p>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim() || !email.trim() || !password || !passwordConfirm) {
              setError('모든 항목을 입력하세요.')
              return
            }
            if (password !== passwordConfirm) {
              setError('비밀번호가 서로 다릅니다.')
              return
            }
            if (password.length < 6) {
              setError('비밀번호는 6자 이상이어야 합니다.')
              return
            }
            if (!isSupabaseConfigured()) {
              setError('Supabase 설정이 없습니다. 환경 변수를 확인하세요.')
              return
            }
            setError('')
            setPending(true)
            void supabase.auth
              .signUp({
                email: email.trim(),
                password,
                options: {
                  data: { name: name.trim() },
                  emailRedirectTo: window.location.origin,
                },
              })
              .then(async ({ data, error: authError }) => {
                if (authError) {
                  setError(authErrorMessage(authError))
                  return
                }
                if (data.session) {
                  await supabase.auth.signOut()
                }
                onSignedUp({ needsEmailConfirm: !data.session })
              })
              .finally(() => setPending(false))
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-name">
              이름
            </label>
            <input
              id="signup-name"
              className={styles.input}
              type="text"
              autoComplete="name"
              value={name}
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
              placeholder="이름"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-email">
              이메일
            </label>
            <input
              id="signup-email"
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
            <label className={styles.label} htmlFor="signup-password">
              비밀번호
            </label>
            <input
              id="signup-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={pending}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6자 이상"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-password-confirm">
              비밀번호 확인
            </label>
            <input
              id="signup-password-confirm"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              disabled={pending}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="비밀번호를 다시 입력"
            />
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? '가입하는 중…' : '회원가입'}
          </button>
        </form>
        <p className={styles.switch}>
          이미 계정이 있나요?{' '}
          <button type="button" className={styles.link} onClick={onGoLogin} disabled={pending}>
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
