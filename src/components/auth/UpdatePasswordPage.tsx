import { useState } from 'react'
import { authErrorMessage } from '../../lib/authErrors.ts'
import { isSupabaseConfigured, supabase } from '../../lib/supabase.ts'
import styles from './AuthScreen.module.css'

interface UpdatePasswordPageProps {
  onUpdated: () => void
  onGoHome: () => void
}

export function UpdatePasswordPage({ onUpdated, onGoHome }: UpdatePasswordPageProps) {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  return (
    <div className={styles.screen}>
      <div className={styles.accountBar}>
        <button type="button" className={styles.link} onClick={onGoHome} disabled={pending}>
          홈으로
        </button>
      </div>
      <div className={styles.card}>
        <h1 className={styles.logo}>MindBridge</h1>
        <p className={styles.lead}>지금 쓰는 비밀번호와 다른 새 비밀번호를 입력하세요.</p>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            if (!password || !passwordConfirm) {
              setError('비밀번호를 입력하세요.')
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
              .updateUser({ password })
              .then(async ({ error: authError }) => {
                if (authError) {
                  setError(authErrorMessage(authError))
                  return
                }
                await supabase.auth.signOut()
                onUpdated()
              })
              .finally(() => setPending(false))
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="new-password">
              새 비밀번호
            </label>
            <input
              id="new-password"
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
            <label className={styles.label} htmlFor="new-password-confirm">
              새 비밀번호 확인
            </label>
            <input
              id="new-password-confirm"
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
            {pending ? '바꾸는 중…' : '비밀번호 바꾸기'}
          </button>
        </form>
      </div>
    </div>
  )
}
