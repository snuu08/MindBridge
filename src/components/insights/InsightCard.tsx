import { useState } from 'react'
import type { Insight } from '../../schemas/insightSchema.ts'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import { INSIGHT_TYPE_LABEL } from '../../types/mindmap.ts'
import { InsightDetails } from './InsightDetails.tsx'
import styles from './insights.module.css'

export function InsightCard({ insight }: { insight: Insight }) {
  const acceptInsight = useMindMapStore((state) => state.acceptInsight)
  const dismissInsight = useMindMapStore((state) => state.dismissInsight)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(insight.title)
  const [content, setContent] = useState(insight.content)

  return (
    <article className={styles.card}>
      <p className={styles.type}>{INSIGHT_TYPE_LABEL[insight.type]}</p>
      {editing ? (
        <>
          <input
            className="styles-input"
            aria-label="제안 제목 수정"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={{ width: '100%', marginBottom: 8, minHeight: 40, padding: '8px 10px' }}
          />
          <textarea
            aria-label="제안 내용 수정"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            style={{ width: '100%', marginBottom: 8, padding: '8px 10px' }}
          />
        </>
      ) : (
        <>
          <h3 className={styles.cardTitle}>{insight.title}</h3>
          <p className={styles.content}>{insight.content}</p>
        </>
      )}
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={() => setOpen((value) => !value)}>
          왜 이 생각인가
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            acceptInsight(insight, editing ? { title, content } : undefined)
          }
        >
          추가
        </button>
        <button type="button" className="btn" onClick={() => setEditing((value) => !value)}>
          수정
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => dismissInsight(insight)}>
          넘기기
        </button>
      </div>
      {open ? <InsightDetails insight={insight} /> : null}
    </article>
  )
}
