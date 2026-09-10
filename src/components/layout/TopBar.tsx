import { useReactFlow } from '@xyflow/react'
import { Download, Redo2, Scan, Undo2 } from 'lucide-react'
import { displayNameFromUser, useAuthSession } from '../../hooks/useAuthSession.ts'
import { downloadJson, downloadPng } from '../../lib/exportMindMap.ts'
import { canActivateAi } from '../../lib/nodePlacement.ts'
import { supabase } from '../../lib/supabase.ts'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import { AI_DISABLED_HINT, FIT_VIEW_MS, MAX_ZOOM, MIN_ZOOM } from '../../types/mindmap.ts'
import styles from './TopBar.module.css'

const SAVE_LABEL = {
  idle: '',
  saving: '저장 중',
  saved: '저장됨',
  failed: '저장 실패',
} as const

interface TopBarProps {
  onGoHome: () => void
}

export function TopBar({ onGoHome }: TopBarProps) {
  const document = useMindMapStore((state) => state.document)
  const saveStatus = useMindMapStore((state) => state.saveStatus)
  const addChild = useMindMapStore((state) => state.addChild)
  const findBlindSpots = useMindMapStore((state) => state.findBlindSpots)
  const undo = useMindMapStore((state) => state.undo)
  const redo = useMindMapStore((state) => state.redo)
  const analysisStatus = useMindMapStore((state) => state.analysisStatus)
  const { fitView } = useReactFlow()
  const { user } = useAuthSession()
  const aiReady = document ? canActivateAi(document.nodes) : false
  const accountLabel = displayNameFromUser(user)

  if (!document) return null

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.logo}>MindBridge</span>
        <span className={styles.topic}>{document.title}</span>
      </div>
      <div className={styles.center}>
        <button type="button" className="btn" onClick={() => addChild()}>
          생각 추가
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!aiReady || analysisStatus === 'loading'}
          onClick={() => {
            void findBlindSpots()
          }}
        >
          놓친 부분 찾기
        </button>
      </div>
      <div className={styles.right}>
        {!aiReady ? <p className={styles.hint}>{AI_DISABLED_HINT}</p> : null}
        <button type="button" className="btn btn-icon" aria-label="실행취소" onClick={undo}>
          <Undo2 size={16} />
        </button>
        <button type="button" className="btn btn-icon" aria-label="다시 실행" onClick={redo}>
          <Redo2 size={16} />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="전체 보기"
          onClick={() =>
            fitView({ duration: FIT_VIEW_MS, padding: 0.2, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM })
          }
        >
          <Scan size={16} />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="JSON으로 내보내기"
          onClick={() => downloadJson(document)}
        >
          <Download size={16} />
        </button>
        <button
          type="button"
          className="btn"
          aria-label="이미지로 내보내기"
          onClick={() => {
            void downloadPng(document)
          }}
        >
          PNG
        </button>
        <span className={styles.status} aria-live="polite">
          {SAVE_LABEL[saveStatus]}
        </span>
        {accountLabel ? <span className={styles.account}>{accountLabel}</span> : null}
        <button type="button" className="btn" onClick={onGoHome}>
          홈으로
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void supabase.auth.signOut()
          }}
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
