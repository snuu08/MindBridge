import { useMindMapStore } from '../../store/useMindMapStore.ts'
import styles from './insights.module.css'

const CATEGORY_LABEL = {
  purpose: '목적',
  check: '확인할 내용',
  method: '실행 방법',
  material: '필요한 자료',
  decision: '회의에서 결정할 사항',
} as const

export function ElaboratePanel() {
  const items = useMindMapStore((state) => state.elaborationItems)
  const selected = useMindMapStore((state) => state.selectedElaborationIds)
  const toggle = useMindMapStore((state) => state.toggleElaborationItem)
  const apply = useMindMapStore((state) => state.applyElaboration)
  const close = useMindMapStore((state) => state.closeElaboration)
  const status = useMindMapStore((state) => state.elaborationStatus)

  if (status === 'loading') {
    return <p className={styles.summary}>안건을 구체화하는 중입니다.</p>
  }

  if (items.length === 0) return null

  const groups = (Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>).map(
    (category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }),
  )

  return (
    <section>
      <h3 className={styles.cardTitle}>안건 구체화</h3>
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.category} className={styles.group}>
            <p className={styles.type}>{CATEGORY_LABEL[group.category]}</p>
            {group.items.map((item) => (
              <label key={item.id} className={styles.check}>
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        ),
      )}
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={apply}>
          회의 안건에 추가
        </button>
        <button type="button" className="btn" onClick={close}>
          닫기
        </button>
      </div>
    </section>
  )
}
