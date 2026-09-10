import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'
import type { MindMapDocument } from '../types/mindmap.ts'

export function downloadJson(document: MindMapDocument): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `${document.title || 'mindbridge'}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadPng(document: MindMapDocument): Promise<void> {
  const viewport = window.document.querySelector('.react-flow__viewport')
  if (!(viewport instanceof HTMLElement) || document.nodes.length === 0) return

  const bounds = getNodesBounds(document.nodes)
  const width = Math.max(bounds.width + 80, 640)
  const height = Math.max(bounds.height + 80, 400)
  const view = getViewportForBounds(bounds, width, height, 0.15, 2.5, 0.16)

  const dataUrl = await toPng(viewport, {
    backgroundColor: '#f4efe6',
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
    },
  })

  const link = window.document.createElement('a')
  link.href = dataUrl
  link.download = `${document.title || 'mindbridge'}.png`
  link.click()
}
