import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import type { MindNode } from '../../types/mindmap.ts'
import styles from './HumanNode.module.css'

export function HumanNode({ id, data, selected }: NodeProps<MindNode>) {
  const editingNodeId = useMindMapStore((state) => state.editingNodeId)
  const setEditingNode = useMindMapStore((state) => state.setEditingNode)
  const updateLabel = useMindMapStore((state) => state.updateLabel)
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
      data-origin="human"
      onDoubleClick={() => setEditingNode(id)}
    >
      <Handle type="target" position={Position.Left} />
      <span className={styles.badge}>내 생각</span>
      {editing ? (
        <textarea
          ref={ref}
          className={styles.input}
          defaultValue={data.label}
          aria-label="생각 수정"
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
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
