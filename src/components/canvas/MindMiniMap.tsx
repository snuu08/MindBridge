import { MiniMap } from '@xyflow/react'
import type { MindNode } from '../../types/mindmap.ts'

export function MindMiniMap() {
  return (
    <MiniMap<MindNode>
      pannable
      zoomable
      ariaLabel="마인드맵 미니맵"
      maskColor="rgba(28, 25, 23, 0.08)"
      nodeStrokeWidth={2}
      nodeColor={(node) => (node.data.origin === 'ai' ? '#d8cde8' : '#efe6d4')}
      nodeStrokeColor={(node) => (node.data.origin === 'ai' ? '#8b7aa8' : '#2c261f')}
    />
  )
}
