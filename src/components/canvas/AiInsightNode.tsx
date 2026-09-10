import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import type { MindNode } from '../../types/mindmap.ts'
import styles from './AiInsightNode.module.css'

function BasedOnLabels({ ids }: { ids: string[] }) {
  const nodes = useMindMapStore((state) => state.document?.nodes ?? [])
  const labels = ids
    .map((id) => nodes.find((node) => node.id === id)?.data.label)
    .filter((label): label is string => Boolean(label))
  if (labels.length === 0) return null
  return (
    <p className={styles.label} style={{ margin: '6px 0 0', color: 'var(--ink-muted)', fontSize: 12 }}>
      이 생각을 참고함: {labels.join(', ')}
    </p>
  )
}

export function AiInsightNode({ id, data, selected }: NodeProps<MindNode>) {
  const editingNodeId = useMindMapStore((state) => state.editingNodeId)
  const setEditingNode = useMindMapStore((state) => state.setEditingNode)
  const updateLabel = useMindMapStore((state) => state.updateLabel)
  const startElaboration = useMindMapStore((state) => state.startElaboration)
  const editing = editingNodeId === id
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  return (
    <div
      className={styles.node}
      data-selected={selected}
      data-origin="ai"
      onDoubleClick={() => setEditingNode(id)}
    >
      <Handle type="target" position={Position.Left} />
      <span className={styles.badge}>AI 생각</span>
      {editing ? (
        <textarea
          ref={ref}
          className={styles.input}
          defaultValue={data.label}
          aria-label="AI 생각 수정"
          rows={2}
          onBlur={(event) => updateLabel(id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              updateLabel(id, event.currentTarget.value)
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              setEditingNode(null)
            }
          }}
        />
      ) : (
        <div className={styles.label}>{data.label}</div>
      )}
      {selected && data.rationale ? (
        <p className={styles.label} style={{ margin: '8px 0 0', color: 'var(--ink-muted)', fontSize: 12 }}>
          {data.rationale}
        </p>
      ) : null}
      {data.basedOnNodeIds && data.basedOnNodeIds.length > 0 && selected ? (
        <BasedOnLabels ids={data.basedOnNodeIds} />
      ) : null}
      {data.aiType === 'agenda' ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            onClick={() => startElaboration(id)}
          >
            구체화
          </button>
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
