import { useMindMapStore } from '../../store/useMindMapStore.ts'
import styles from './insights.module.css'

export function ClarificationCard() {
  const clarification = useMindMapStore((state) => state.clarification)
  const answerClarification = useMindMapStore((state) => state.answerClarification)
  if (!clarification) return null

  return (
    <article className={styles.card}>
      <p className={styles.type}>확인이 필요합니다</p>
      <h3 className={styles.cardTitle}>{clarification.question}</h3>
      <div className={styles.actions}>
        {clarification.options.map((option) => (
          <button
            key={option}
            type="button"
            className="btn"
            onClick={() => {
              void answerClarification(option)
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </article>
  )
}
