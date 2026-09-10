import { InsightPanel } from '../insights/InsightPanel.tsx'
import styles from '../insights/insights.module.css'

export function MobileInsightSheet() {
  return (
    <div className={styles.sheet}>
      <InsightPanel />
    </div>
  )
}
