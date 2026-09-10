import { ReactFlowProvider } from '@xyflow/react'
import { useEffect, useState } from 'react'
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage.tsx'
import { LoginPage } from './components/auth/LoginPage.tsx'
import { SignupPage } from './components/auth/SignupPage.tsx'
import { UpdatePasswordPage } from './components/auth/UpdatePasswordPage.tsx'
import styles from './components/auth/AuthScreen.module.css'
import { MindCanvas } from './components/canvas/MindCanvas.tsx'
import { InsightPanel } from './components/insights/InsightPanel.tsx'
import { HomePage } from './components/layout/HomePage.tsx'
import { MobileInsightSheet } from './components/layout/MobileInsightSheet.tsx'
import { StartScreen } from './components/layout/StartScreen.tsx'
import { TopBar } from './components/layout/TopBar.tsx'
import { useAuthSession } from './hooks/useAuthSession.ts'
import { useMindMapStore } from './store/useMindMapStore.ts'

function useMobile(max = 860) {
  const [mobile, setMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth <= max,
  )
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= max)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [max])
  return mobile
}

function Workspace({ onGoHome }: { onGoHome: () => void }) {
  const insightPanelOpen = useMindMapStore((state) => state.insightPanelOpen)
  const mobile = useMobile()

  return (
    <div className="app-shell">
      <TopBar onGoHome={onGoHome} />
      <div className="workspace">
        <MindCanvas />
        {insightPanelOpen ? (
          mobile ? (
            <MobileInsightSheet />
          ) : (
            <div style={{ position: 'absolute', inset: '0 0 0 auto', zIndex: 6 }}>
              <InsightPanel />
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}

export default function App() {
  const document = useMindMapStore((state) => state.document)
  const hydrate = useMindMapStore((state) => state.hydrate)
  const openDocument = useMindMapStore((state) => state.openDocument)
  const closeDocument = useMindMapStore((state) => state.closeDocument)
  const persistNow = useMindMapStore((state) => state.persistNow)
  const { session, recovery, loading, finishRecovery } = useAuthSession()
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'forgot'>('login')
  const [authNotice, setAuthNotice] = useState('')
  const [inProgram, setInProgram] = useState(false)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!session) setInProgram(false)
  }, [session])

  if (loading) {
    return (
      <div className={styles.screen}>
        <p className={styles.lead}>불러오는 중…</p>
      </div>
    )
  }

  if (recovery) {
    return (
      <UpdatePasswordPage
        onGoHome={() => {
          finishRecovery()
        }}
        onUpdated={() => {
          finishRecovery()
          setAuthNotice('비밀번호가 바뀌었습니다. 새 비밀번호로 로그인해 주세요.')
          setAuthScreen('login')
        }}
      />
    )
  }

  if (!session) {
    if (authScreen === 'forgot') {
      return (
        <ForgotPasswordPage
          onGoLogin={() => {
            setAuthNotice('')
            setAuthScreen('login')
          }}
        />
      )
    }
    if (authScreen === 'signup') {
      return (
        <SignupPage
          onGoLogin={() => {
            setAuthNotice('')
            setAuthScreen('login')
          }}
          onSignedUp={({ needsEmailConfirm }) => {
            setAuthNotice(
              needsEmailConfirm
                ? '가입 확인 메일을 보냈습니다. 이메일의 링크를 누른 뒤 로그인해 주세요.'
                : '가입되었습니다. 로그인해 주세요.',
            )
            setAuthScreen('login')
          }}
        />
      )
    }
    return (
      <LoginPage
        notice={authNotice}
        onGoSignup={() => {
          setAuthNotice('')
          setAuthScreen('signup')
        }}
        onForgotPassword={() => {
          setAuthNotice('')
          setAuthScreen('forgot')
        }}
      />
    )
  }

  if (!inProgram) {
    return (
      <HomePage
        onStartNew={() => {
          closeDocument()
          setInProgram(true)
        }}
        onOpenDocument={(id) => {
          openDocument(id)
          setInProgram(true)
        }}
      />
    )
  }

  const goHome = () => {
    persistNow()
    setInProgram(false)
  }

  if (!document) {
    return <StartScreen onGoHome={goHome} />
  }

  return (
    <ReactFlowProvider>
      <Workspace onGoHome={goHome} />
    </ReactFlowProvider>
  )
}
