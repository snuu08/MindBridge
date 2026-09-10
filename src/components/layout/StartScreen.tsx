import { useState } from 'react'
import { displayNameFromUser, useAuthSession } from '../../hooks/useAuthSession.ts'
import { supabase } from '../../lib/supabase.ts'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import styles from './StartScreen.module.css'

const EXAMPLES = ['이번 회의 안건', '새로운 행사 아이디어', '이번 학기 계획']

interface StartScreenProps {
  onGoHome?: () => void
}

export function StartScreen({ onGoHome }: StartScreenProps) {
  const startDocument = useMindMapStore((state) => state.startDocument)
  const { user } = useAuthSession()
  const [topic, setTopic] = useState('')
  const accountLabel = displayNameFromUser(user)

  return (
    <div className={styles.screen}>
      <div className={styles.accountBar}>
        {accountLabel ? <span>{accountLabel}</span> : null}
        {onGoHome ? (
          <button type="button" className={styles.signOut} onClick={onGoHome}>
            홈으로
          </button>
        ) : null}
        <button
          type="button"
          className={styles.signOut}
          onClick={() => {
            void supabase.auth.signOut()
          }}
        >
          로그아웃
        </button>
      </div>
      <div className={styles.card}>
        <h1 className={styles.logo}>MindBridge</h1>
        <p className={styles.lead}>먼저 생각을 적으면, AI가 놓친 부분을 함께 생각합니다.</p>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            startDocument(topic || '이번 회의 안건')
          }}
        >
          <label className="sr-only" htmlFor="topic">
            주제
          </label>
          <input
            id="topic"
            className={styles.input}
            value={topic}
            placeholder="이번 회의 안건"
            onChange={(event) => setTopic(event.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            생각 시작하기
          </button>
        </form>
        <div className={styles.examples}>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className={styles.example}
              onClick={() => startDocument(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
