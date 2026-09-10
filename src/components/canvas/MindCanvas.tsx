import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'
import { isTypingTarget, shouldIgnoreNodeDelete } from '../../lib/keyboard.ts'
import {
  getNodeBounds,
  isPointInViewport,
  shouldAutoFitView,
} from '../../lib/viewport.ts'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import { FIT_VIEW_MS, MAX_ZOOM, MIN_ZOOM } from '../../types/mindmap.ts'
import { AiInsightNode } from './AiInsightNode.tsx'
import { CanvasControls } from './CanvasControls.tsx'
import { HumanNode } from './HumanNode.tsx'
import { MindMiniMap } from './MindMiniMap.tsx'
import '@xyflow/react/dist/style.css'

const nodeTypes: NodeTypes = {
  human: HumanNode,
  ai: AiInsightNode,
}

export function MindCanvas() {
  const document = useMindMapStore((state) => state.document)
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId)
  const lastAddedNodeIds = useMindMapStore((state) => state.lastAddedNodeIds)
  const applyNodeChanges = useMindMapStore((state) => state.applyNodeChanges)
  const selectNode = useMindMapStore((state) => state.selectNode)
  const setViewport = useMindMapStore((state) => state.setViewport)
  const addChild = useMindMapStore((state) => state.addChild)
  const deleteSelected = useMindMapStore((state) => state.deleteSelected)
  const undo = useMindMapStore((state) => state.undo)
  const redo = useMindMapStore((state) => state.redo)
  const remember = useMindMapStore((state) => state.remember)
  const closeInsightPanel = useMindMapStore((state) => state.closeInsightPanel)
  const insightPanelOpen = useMindMapStore((state) => state.insightPanelOpen)
  const clearLastAdded = useMindMapStore((state) => state.clearLastAdded)
  const { fitView, setCenter, getViewport } = useReactFlow()
  const boundsRef = useRef(getNodeBounds(document?.nodes ?? []))

  const nodes = document?.nodes ?? []
  const edges = document?.edges ?? []

  const selected = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
  }))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        if (event.key === 'Escape') {
          useMindMapStore.getState().setEditingNode(null)
        }
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        addChild()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !shouldIgnoreNodeDelete(event.target)) {
        event.preventDefault()
        deleteSelected()
        return
      }
      if (event.key === 'Escape' && insightPanelOpen) {
        closeInsightPanel()
        return
      }
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
      if (meta && event.key === '0') {
        event.preventDefault()
        fitView({ duration: FIT_VIEW_MS, padding: 0.2, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addChild, closeInsightPanel, deleteSelected, fitView, insightPanelOpen, redo, undo])

  useEffect(() => {
    if (lastAddedNodeIds.length === 0 || !document) return
    const nextBounds = getNodeBounds(document.nodes)
    const prev = boundsRef.current
    const viewport = getViewport()
    const screen = { width: window.innerWidth, height: window.innerHeight }
    const first = document.nodes.find((node) => node.id === lastAddedNodeIds[0])
    const newNodeOutside = first
      ? !isPointInViewport(first.position, viewport, screen)
      : false
    const fitNew = shouldAutoFitView({
      reason: 'new-node',
      newNodeOutside,
      previousWidth: prev.width,
      nextWidth: nextBounds.width,
      previousHeight: prev.height,
      nextHeight: nextBounds.height,
    })
    const fitBounds = shouldAutoFitView({
      reason: 'bounds',
      previousWidth: prev.width,
      nextWidth: nextBounds.width,
      previousHeight: prev.height,
      nextHeight: nextBounds.height,
    })
    if (fitBounds) {
      fitView({ duration: FIT_VIEW_MS, padding: 0.18, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM })
    } else if (fitNew && first) {
      setCenter(first.position.x + 120, first.position.y + 40, {
        zoom: viewport.zoom,
        duration: FIT_VIEW_MS,
      })
    }
    boundsRef.current = nextBounds
    clearLastAdded()
  }, [clearLastAdded, document, fitView, getViewport, lastAddedNodeIds, setCenter])

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport)
    },
    [setViewport],
  )

  if (!document) return null

  return (
    <ReactFlow
      nodes={selected}
      edges={edges}
      nodeTypes={nodeTypes}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      defaultViewport={document.viewport}
      onNodesChange={applyNodeChanges}
      onNodeDragStart={remember}
      onNodeClick={(_event, node) => selectNode(node.id)}
      onPaneClick={() => selectNode(null)}
      onMoveEnd={onMoveEnd}
      deleteKeyCode={null}
      selectionOnDrag={false}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      zoomOnDoubleClick={false}
      fitView={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#d8d0c3" />
      <MindMiniMap />
      <CanvasControls />
    </ReactFlow>
  )
}
