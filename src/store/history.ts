import type { MindEdge, MindNode } from '../types/mindmap.ts'

export interface HistorySnapshot {
  nodes: MindNode[]
  edges: MindEdge[]
  dismissedInsightTitles: string[]
}

export function cloneSnapshot(snapshot: HistorySnapshot): HistorySnapshot {
  return structuredClone(snapshot)
}

export function pushSnapshot(
  past: HistorySnapshot[],
  snapshot: HistorySnapshot,
  limit = 50,
): HistorySnapshot[] {
  const next = [...past, cloneSnapshot(snapshot)]
  if (next.length > limit) next.shift()
  return next
}
