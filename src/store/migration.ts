import type { MindMapDocument, MindNode } from '../types/mindmap.ts'

const STORAGE_KEY = 'mindbridge:document'
const BACKUP_PREFIX = 'mindbridge:backup:'

function isNode(value: unknown): value is MindNode {
  if (!value || typeof value !== 'object') return false
  const node = value as Record<string, unknown>
  const data = node.data as Record<string, unknown> | undefined
  return (
    typeof node.id === 'string' &&
    typeof node.position === 'object' &&
    node.position !== null &&
    typeof data?.label === 'string' &&
    (data.origin === 'human' || data.origin === 'ai')
  )
}

export function migrateDocument(raw: unknown): MindMapDocument | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const nodes = Array.isArray(value.nodes) ? value.nodes.filter(isNode) : []
  if (nodes.length === 0 || typeof value.title !== 'string') return null

  const now = new Date().toISOString()
  return {
    version: 2,
    id: typeof value.id === 'string' ? value.id : `doc-${Date.now()}`,
    title: value.title,
    nodes,
    edges: Array.isArray(value.edges) ? (value.edges as MindMapDocument['edges']) : [],
    viewport:
      value.viewport && typeof value.viewport === 'object'
        ? (value.viewport as MindMapDocument['viewport'])
        : undefined,
    dismissedInsightTitles: Array.isArray(value.dismissedInsightTitles)
      ? value.dismissedInsightTitles.filter((item): item is string => typeof item === 'string')
      : [],
    passwordHash: typeof value.passwordHash === 'string' && value.passwordHash ? value.passwordHash : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  }
}

export function backupRawDocument(raw: string): void {
  try {
    localStorage.setItem(`${BACKUP_PREFIX}${Date.now()}`, raw)
  } catch {
    // Ignore quota errors; the app must keep running.
  }
}

export { STORAGE_KEY }
