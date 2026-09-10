import { useState } from 'react'
import { authErrorMessage } from '../../lib/authErrors.ts'
import { isSupabaseConfigured, supabase } from '../../lib/supabase.ts'
import styles from './AuthScreen.module.css'

interface ForgotPasswordPageProps {
  onGoLogin: () => void
}

export function ForgotPasswordPage({ onGoLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  return (
    <div className={styles.screen}>
      <div className={styles.accountBar}>
        <button type="button" className={styles.link} onClick={onGoLogin} disabled={pending}>
          홈으로
        </button>
      </div>
      <div className={styles.card}>
        <h1 className={styles.logo}>MindBridge</h1>
        <p className={styles.lead}>가입한 이메일로 비밀번호 재설정 링크를 보냅니다.</p>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            if (!email.trim()) {
              setError('이메일을 입력하세요.')
              setNotice('')
              return
            }
            if (!isSupabaseConfigured()) {
              setError('Supabase 설정이 없습니다. 환경 변수를 확인하세요.')
              setNotice('')
              return
            }
            setError('')
            setNotice('')
            setPending(true)
            void supabase.auth
              .resetPasswordForEmail(email.trim(), {
                redirectTo: window.location.origin,
              })
              .then(({ error: authError }) => {
                if (authError) {
                  setError(authErrorMessage(authError))
                  return
                }
                setNotice('해당 이메일이 가입되어 있다면 재설정 메일을 보냈습니다. 받은 편지함을 확인해 주세요.')
              })
              .finally(() => setPending(false))
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="forgot-email">
              이메일
            </label>
            <input
              id="forgot-email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              disabled={pending}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? '보내는 중…' : '재설정 메일 보내기'}
          </button>
        </form>
        <p className={styles.switch}>
          <button type="button" className={styles.link} onClick={onGoLogin} disabled={pending}>
            로그인으로 돌아가기
          </button>
        </p>
      </div>
    </div>
  )
}
