import type {
  AnalysisPayload,
  AnalysisRequestType,
  AnalysisScope,
  MindMapDocument,
  MindNode,
} from '../types/mindmap.ts'
import { getRootNode } from './nodePlacement.ts'

export const FULL_USER_CONTEXT_RULE =
  '선택한 노드는 관심 지점일 뿐이다. 그 가지만 따로 보지 말고, 중심 주제부터 사용자가 직접 작성한 모든 생각을 이어서 분석한 뒤, 그 전체에서 아직 없는 대안을 제안하라.'

function nearestHumanParentId(nodes: MindNode[], node: MindNode): string | null {
  const byId = new Map(nodes.map((item) => [item.id, item]))
  let current = node.data.parentId ? byId.get(node.data.parentId) : undefined
  while (current) {
    if (current.data.origin === 'human') return current.id
    current = current.data.parentId ? byId.get(current.data.parentId) : undefined
  }
  return null
}

function buildPaths(
  nodes: MindNode[],
  included: Set<string>,
  onlyHuman = false,
): string[][] {
  const children = new Map<string, MindNode[]>()
  for (const node of nodes) {
    if (!included.has(node.id)) continue
    if (onlyHuman && node.data.origin !== 'human') continue
    const parentId = onlyHuman
      ? nearestHumanParentId(nodes, node)
      : (node.data.parentId ?? null)
    if (!parentId || !included.has(parentId)) continue
    const list = children.get(parentId) ?? []
    list.push(node)
    children.set(parentId, list)
  }

  const root = getRootNode(nodes)
  if (!root || !included.has(root.id)) return []

  const paths: string[][] = []
  const walk = (node: MindNode, trail: string[]) => {
    if (onlyHuman && node.data.origin !== 'human') return
    const next = [...trail, node.data.label]
    const kids = children.get(node.id) ?? []
    if (kids.length === 0) {
      paths.push(next)
      return
    }
    for (const child of kids) walk(child, next)
  }
  walk(root, [])
  return paths
}

export function buildAnalysisPayload(
  document: MindMapDocument,
  selectedNodeId: string | null,
  requestType: AnalysisRequestType,
  extraExisting: string[] = [],
  clarificationAnswer?: string,
): AnalysisPayload {
  const scope: AnalysisScope = selectedNodeId
    ? { type: 'branch', focusNodeId: selectedNodeId }
    : { type: 'all' }

  const included = new Set(document.nodes.map((node) => node.id))

  const existingInsights = [
    ...document.nodes
      .filter((node) => node.data.origin === 'ai')
      .map((node) => node.data.label),
    ...document.dismissedInsightTitles,
    ...extraExisting,
  ]

  return {
    topic: document.title,
    scope,
    nodes: document.nodes.map((node) => ({
      id: node.id,
      label: node.data.label,
      origin: node.data.origin,
      parentId: node.data.parentId ?? null,
    })),
    paths: buildPaths(document.nodes, included),
    humanPaths: buildPaths(document.nodes, included, true),
    existingInsights,
    requestType,
    contextRule: FULL_USER_CONTEXT_RULE,
    clarificationAnswer,
  }
}

export function describeScope(
  nodes: MindNode[],
  selectedNodeId: string | null,
): string {
  const human = nodes.filter((node) => node.data.origin === 'human')
  const trail = human.map((node) => node.data.label).join(' → ')
  if (!selectedNodeId) {
    return trail
      ? `${trail} 전체를 이어서 분석 중`
      : '처음부터 작성한 생각 전체를 분석 중'
  }
  const node = nodes.find((item) => item.id === selectedNodeId)
  const label = node?.data.label ?? '선택한 생각'
  return `‘${label}’에서 출발해 ${trail} 전체를 이어서 분석 중`
}
