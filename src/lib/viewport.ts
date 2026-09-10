import type { Viewport } from '@xyflow/react'
import type { MindNode } from '../types/mindmap.ts'

export function getNodeBounds(nodes: MindNode[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    const width = node.measured?.width ?? 240
    const height = node.measured?.height ?? 92
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + width)
    maxY = Math.max(maxY, node.position.y + height)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function isPointInViewport(
  point: { x: number; y: number },
  viewport: Viewport,
  screen: { width: number; height: number },
  padding = 48,
): boolean {
  const screenX = point.x * viewport.zoom + viewport.x
  const screenY = point.y * viewport.zoom + viewport.y
  return (
    screenX >= padding &&
    screenY >= padding &&
    screenX <= screen.width - padding &&
    screenY <= screen.height - padding
  )
}

export function shouldAutoFitView(options: {
  reason: 'user' | 'new-node' | 'bounds'
  newNodeOutside?: boolean
  previousWidth: number
  nextWidth: number
  previousHeight: number
  nextHeight: number
}): boolean {
  if (options.reason === 'user') return true
  if (options.reason === 'new-node') return Boolean(options.newNodeOutside)
  if (options.previousWidth === 0 || options.previousHeight === 0) return false
  const grewWidth = options.nextWidth / options.previousWidth >= 1.15
  const grewHeight = options.nextHeight / options.previousHeight >= 1.15
  return grewWidth || grewHeight
}
