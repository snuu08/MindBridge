import { useReactFlow } from '@xyflow/react'
import { Focus, Minus, Plus } from 'lucide-react'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import { FIT_VIEW_MS, MAX_ZOOM, MIN_ZOOM } from '../../types/mindmap.ts'
import styles from './CanvasControls.module.css'

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow()
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId)
  const nodes = useMindMapStore((state) => state.document?.nodes ?? [])

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className="btn btn-icon"
        aria-label="확대"
        onClick={() => zoomIn({ duration: 180 })}
      >
        <Plus size={16} />
      </button>
      <button
        type="button"
        className="btn btn-icon"
        aria-label="축소"
        onClick={() => zoomOut({ duration: 180 })}
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        className="btn btn-icon"
        aria-label="선택 노드로 이동"
        onClick={() => {
          const selected = nodes.find((node) => node.id === selectedNodeId)
          if (selected) {
            setCenter(selected.position.x + 120, selected.position.y + 40, {
              zoom: 1,
              duration: FIT_VIEW_MS,
            })
            return
          }
          fitView({
            duration: FIT_VIEW_MS,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            padding: 0.2,
          })
        }}
      >
        <Focus size={16} />
      </button>
    </div>
  )
}
