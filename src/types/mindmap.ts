import type { Edge, Node, Viewport } from '@xyflow/react'

export type NodeOrigin = 'human' | 'ai'

export type AiNodeType = 'agenda' | 'perspective' | 'question' | 'action'

export type InsightType = AiNodeType

export interface MindNodeData extends Record<string, unknown> {
  label: string
  origin: NodeOrigin
  parentId?: string
  createdAt: string
  updatedAt: string
  aiType?: AiNodeType
  aiContent?: string
  rationale?: string
  gap?: string
  basedOnNodeIds?: string[]
  questions?: string[]
  actions?: string[]
  acceptedByUser?: boolean
  editedByUser?: boolean
}

export interface MindEdgeData extends Record<string, unknown> {
  origin: NodeOrigin
}

export type MindNode = Node<MindNodeData>
export type MindEdge = Edge<MindEdgeData>

export interface MindMapDocument {
  version: 2
  id: string
  title: string
  nodes: MindNode[]
  edges: MindEdge[]
  viewport?: Viewport
  dismissedInsightTitles: string[]
  passwordHash?: string
  createdAt: string
  updatedAt: string
}

export type AnalysisScope =
  | { type: 'all' }
  | { type: 'branch'; focusNodeId: string }

export type AnalysisRequestType = 'find_blind_spots' | 'rethink'

export interface AnalysisPayloadNode {
  id: string
  label: string
  origin: NodeOrigin
  parentId: string | null
}

export interface AnalysisPayload {
  topic: string
  scope: AnalysisScope
  nodes: AnalysisPayloadNode[]
  paths: string[][]
  humanPaths: string[][]
  existingInsights: string[]
  requestType: AnalysisRequestType
  contextRule: string
  clarificationAnswer?: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

export type AnalysisStatus = 'idle' | 'loading' | 'error'

export type ElaborationCategory =
  | 'purpose'
  | 'check'
  | 'method'
  | 'material'
  | 'decision'

export interface ElaborationItem {
  id: string
  category: ElaborationCategory
  label: string
}

export interface ElaborationResult {
  purpose: string
  checks: string[]
  methods: string[]
  materials: string[]
  decisions: string[]
}

export const MIN_ZOOM = 0.15
export const MAX_ZOOM = 2.5
export const FIT_VIEW_MS = 360

export const INSIGHT_TYPE_LABEL: Record<InsightType, string> = {
  agenda: '새로운 안건',
  perspective: '놓친 관점',
  question: '확인할 질문',
  action: '실행 제안',
}

export const AI_ERROR_MESSAGE =
  '지금은 AI의 새로운 생각을 불러오지 못했습니다.\n직접 생각 작성은 계속 사용할 수 있습니다.'

export const AI_DISABLED_HINT = 'AI에게 맡기기 전에 생각을 조금 더 적어보세요.'
