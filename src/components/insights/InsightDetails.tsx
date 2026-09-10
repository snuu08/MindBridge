import type { Insight } from '../../schemas/insightSchema.ts'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import styles from './insights.module.css'

export function InsightDetails({ insight }: { insight: Insight }) {
  const nodes = useMindMapStore((state) => state.document?.nodes ?? [])
  const labels = insight.basedOnNodeIds
    .map((id) => nodes.find((node) => node.id === id)?.data.label)
    .filter((label): label is string => Boolean(label))

  return (
    <div className={styles.details}>
      <p>
        <strong>참고한 사용자 노드</strong>
        <br />
        {labels.length > 0 ? labels.join(', ') : '현재 생각 전체'}
      </p>
      <p>
        <strong>놓쳐 있던 사고의 공백</strong>
        <br />
        {insight.gap}
      </p>
      {insight.questions.length > 0 ? (
        <>
          <p>
            <strong>확인할 질문</strong>
          </p>
          <ul>
            {insight.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </>
      ) : null}
      {insight.actions.length > 0 ? (
        <>
          <p>
            <strong>다음 행동</strong>
          </p>
          <ul>
            {insight.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
