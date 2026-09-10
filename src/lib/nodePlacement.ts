import type { MindNode } from '../types/mindmap.ts'

const NODE_WIDTH = 240
const NODE_HEIGHT = 92
const GAP_X = 72
const GAP_Y = 28
const AI_EXTRA_X = 40

function overlaps(
  x: number,
  y: number,
  others: Array<{ x: number; y: number }>,
): boolean {
  return others.some(
    (other) =>
      Math.abs(other.x - x) < NODE_WIDTH - 16 &&
      Math.abs(other.y - y) < NODE_HEIGHT - 12,
  )
}

export function placeChildPosition(
  parent: MindNode,
  siblings: MindNode[],
  options?: { isAi?: boolean },
): { x: number; y: number } {
  const occupied = [parent, ...siblings].map((node) => node.position)
  const offsetX = NODE_WIDTH + GAP_X + (options?.isAi ? AI_EXTRA_X : 0)
  let y = parent.position.y + siblings.length * (NODE_HEIGHT + GAP_Y)
  let x = parent.position.x + offsetX

  let guard = 0
  while (overlaps(x, y, occupied) && guard < 40) {
    y += NODE_HEIGHT + GAP_Y
    guard += 1
  }

  return { x, y }
}

export function pickParentId(
  basedOnNodeIds: string[],
  nodes: MindNode[],
): string | undefined {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  let best: MindNode | undefined
  let bestDepth = -1

  for (const id of basedOnNodeIds) {
    const node = byId.get(id)
    if (!node) continue
    let depth = 0
    let current: MindNode | undefined = node
    while (current?.data.parentId) {
      depth += 1
      current = byId.get(current.data.parentId)
    }
    if (depth > bestDepth) {
      best = node
      bestDepth = depth
    }
  }

  return best?.id
}

export function collectSubtreeIds(nodes: MindNode[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId])
  let added = true
  while (added) {
    added = false
    for (const node of nodes) {
      if (node.data.parentId && ids.has(node.data.parentId) && !ids.has(node.id)) {
        ids.add(node.id)
        added = true
      }
    }
  }
  return ids
}

export function collectAncestorIds(nodes: MindNode[], nodeId: string): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const ancestors: string[] = []
  let current = byId.get(nodeId)
  while (current?.data.parentId) {
    ancestors.push(current.data.parentId)
    current = byId.get(current.data.parentId)
  }
  return ancestors
}

export function getRootNode(nodes: MindNode[]): MindNode | undefined {
  return nodes.find((node) => !node.data.parentId) ?? nodes[0]
}

export function countHumanChildren(nodes: MindNode[]): number {
  const root = getRootNode(nodes)
  return nodes.filter(
    (node) => node.data.origin === 'human' && node.id !== root?.id,
  ).length
}

export function canActivateAi(nodes: MindNode[]): boolean {
  return Boolean(getRootNode(nodes)) && countHumanChildren(nodes) >= 2
}

export function getDescendantIds(nodes: MindNode[], nodeId: string): string[] {
  const ids = collectSubtreeIds(nodes, nodeId)
  ids.delete(nodeId)
  return [...ids]
}
