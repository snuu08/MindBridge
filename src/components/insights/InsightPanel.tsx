import { useMindMapStore } from '../../store/useMindMapStore.ts'
import { ClarificationCard } from './ClarificationCard.tsx'
import { ElaboratePanel } from './ElaboratePanel.tsx'
import { InsightCard } from './InsightCard.tsx'
import styles from './insights.module.css'

export function InsightPanel() {
  const analysisStatus = useMindMapStore((state) => state.analysisStatus)
  const analysisError = useMindMapStore((state) => state.analysisError)
  const analysisSummary = useMindMapStore((state) => state.analysisSummary)
  const analysisScopeLabel = useMindMapStore((state) => state.analysisScopeLabel)
  const insights = useMindMapStore((state) => state.insights)
  const rethink = useMindMapStore((state) => state.rethink)
  const closeInsightPanel = useMindMapStore((state) => state.closeInsightPanel)

  return (
    <aside className={styles.panel} aria-label="AI가 새로 생각한 내용">
      <h2 className={styles.title}>AI가 새로 생각한 내용</h2>
      <p className={styles.scope}>{analysisScopeLabel}</p>
      {analysisStatus === 'loading' ? (
        <p className={styles.summary}>생각을 살펴보는 중입니다. 길면 20초 안에 결과를 보여줍니다.</p>
      ) : null}
      {analysisError ? <p className={styles.error}>{analysisError}</p> : null}
      {analysisSummary && analysisStatus !== 'loading' ? (
        <p className={styles.summary}>{analysisSummary}</p>
      ) : null}
      <ElaboratePanel />
      <ClarificationCard />
      <div className={styles.list}>
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className="btn"
          disabled={analysisStatus === 'loading'}
          onClick={() => {
            void rethink()
          }}
        >
          다시 생각하기
        </button>
        <button type="button" className="btn btn-ghost" onClick={closeInsightPanel}>
          닫기
        </button>
      </div>
    </aside>
  )
}
