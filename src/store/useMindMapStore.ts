import { applyNodeChanges, type NodeChange, type Viewport } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { analyzeThoughts, elaborateInsight } from '../lib/api.ts'
import { getMockAnalysis } from '../lib/mockAi.ts'
import { isDuplicateTitle } from '../lib/duplicateDetection.ts'
import { buildAnalysisPayload, describeScope } from '../lib/graphContext.ts'
import {
  canActivateAi,
  collectSubtreeIds,
  getRootNode,
  pickParentId,
  placeChildPosition,
} from '../lib/nodePlacement.ts'
import type { Insight } from '../schemas/insightSchema.ts'
import type {
  AnalysisStatus,
  ElaborationItem,
  ElaborationResult,
  MindEdge,
  MindMapDocument,
  MindNode,
  SaveStatus,
} from '../types/mindmap.ts'
import { AI_ERROR_MESSAGE } from '../types/mindmap.ts'
import { cloneSnapshot, pushSnapshot, type HistorySnapshot } from './history.ts'
import { documentPasswordMatches, hashDocumentPassword } from '../lib/documentLock.ts'
import {
  deleteLibraryDocument,
  getLibraryDocument,
  loadDocument,
  loadLibrary,
  saveDocument,
  updateLibraryDocument,
} from './persistence.ts'

function now(): string {
  return new Date().toISOString()
}

function snapshotOf(document: MindMapDocument): HistorySnapshot {
  return {
    nodes: document.nodes,
    edges: document.edges,
    dismissedInsightTitles: document.dismissedInsightTitles,
  }
}

function createHumanNode(
  label: string,
  position: { x: number; y: number },
  parentId?: string,
): MindNode {
  const createdAt = now()
  return {
    id: nanoid(),
    type: 'human',
    position,
    data: {
      label,
      origin: 'human',
      parentId,
      createdAt,
      updatedAt: createdAt,
    },
  }
}

function createEdge(source: string, target: string, origin: 'human' | 'ai'): MindEdge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    data: { origin },
    style:
      origin === 'ai'
        ? { stroke: '#8b7aa8', strokeDasharray: '5 4', strokeWidth: 1.4 }
        : { stroke: '#3f3a34', strokeWidth: 1.4 },
  }
}

function createDocument(title: string): MindMapDocument {
  const createdAt = now()
  const root = createHumanNode(title, { x: 80, y: 180 })
  return {
    version: 2,
    id: nanoid(),
    title,
    nodes: [root],
    edges: [],
    viewport: { x: 40, y: 24, zoom: 1 },
    dismissedInsightTitles: [],
    createdAt,
    updatedAt: createdAt,
  }
}

function elaborationItems(result: ElaborationResult): ElaborationItem[] {
  const items: ElaborationItem[] = [
    { id: nanoid(), category: 'purpose', label: result.purpose },
    ...result.checks.map((label) => ({
      id: nanoid(),
      category: 'check' as const,
      label,
    })),
    ...result.methods.map((label) => ({
      id: nanoid(),
      category: 'method' as const,
      label,
    })),
    ...result.materials.map((label) => ({
      id: nanoid(),
      category: 'material' as const,
      label,
    })),
    ...result.decisions.map((label) => ({
      id: nanoid(),
      category: 'decision' as const,
      label,
    })),
  ]
  return items
}

interface MindMapState {
  document: MindMapDocument | null
  selectedNodeId: string | null
  editingNodeId: string | null
  lastAddedNodeIds: string[]
  saveStatus: SaveStatus
  insightPanelOpen: boolean
  analysisStatus: AnalysisStatus
  analysisError: string | null
  analysisSummary: string
  analysisScopeLabel: string
  insights: Insight[]
  clarification: AnalysisResponseClarification
  clarificationAnswer: string | null
  elaborationNodeId: string | null
  elaboration: ElaborationResult | null
  elaborationItems: ElaborationItem[]
  selectedElaborationIds: string[]
  elaborationStatus: AnalysisStatus
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  library: MindMapDocument[]
  startDocument: (title: string) => void
  openDocument: (id: string) => void
  closeDocument: () => void
  renameDocument: (id: string, title: string) => boolean
  deleteDocument: (id: string) => void
  setDocumentPassword: (
    id: string,
    password: string,
    currentPassword?: string,
  ) => Promise<string | null>
  clearDocumentPassword: (id: string, currentPassword: string) => Promise<string | null>
  verifyDocumentPassword: (id: string, password: string) => Promise<boolean>
  persistNow: () => void
  hydrate: () => void
  persistSoon: () => void
  remember: () => void
  undo: () => void
  redo: () => void
  selectNode: (id: string | null) => void
  setEditingNode: (id: string | null) => void
  addChild: (label?: string, parentId?: string) => string | null
  updateLabel: (id: string, label: string) => void
  deleteSelected: () => void
  applyNodeChanges: (changes: NodeChange<MindNode>[]) => void
  setViewport: (viewport: Viewport) => void
  clearLastAdded: () => void
  findBlindSpots: () => Promise<void>
  rethink: () => Promise<void>
  answerClarification: (option: string) => Promise<void>
  acceptInsight: (insight: Insight, edits?: { title?: string; content?: string }) => void
  dismissInsight: (insight: Insight) => void
  closeInsightPanel: () => void
  startElaboration: (nodeId: string) => Promise<void>
  toggleElaborationItem: (id: string) => void
  applyElaboration: () => void
  closeElaboration: () => void
}

type AnalysisResponseClarification = {
  question: string
  options: string[]
} | null

let persistTimer: ReturnType<typeof setTimeout> | null = null

const initialDocument = loadDocument()
const initialLibrary = loadLibrary()

export const useMindMapStore = create<MindMapState>((set, get) => ({
  document: initialDocument,
  selectedNodeId: initialDocument
    ? (getRootNode(initialDocument.nodes)?.id ?? null)
    : null,
  editingNodeId: null,
  lastAddedNodeIds: [],
  saveStatus: 'idle',
  insightPanelOpen: false,
  analysisStatus: 'idle',
  analysisError: null,
  analysisSummary: '',
  analysisScopeLabel: '',
  insights: [],
  clarification: null,
  clarificationAnswer: null,
  elaborationNodeId: null,
  elaboration: null,
  elaborationItems: [],
  selectedElaborationIds: [],
  elaborationStatus: 'idle',
  past: [],
  future: [],
  library: initialLibrary,

  hydrate: () => {
    const document = loadDocument()
    set({
      document,
      library: loadLibrary(),
      selectedNodeId: document ? (getRootNode(document.nodes)?.id ?? null) : null,
      saveStatus: document ? 'saved' : 'idle',
    })
  },

  persistSoon: () => {
    const { document } = get()
    if (!document) return
    set({ saveStatus: 'saving' })
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      const current = get().document
      if (!current) return
      set({ saveStatus: saveDocument(current), library: loadLibrary() })
    }, 500)
  },

  persistNow: () => {
    const { document } = get()
    if (!document) return
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    set({ saveStatus: saveDocument(document), library: loadLibrary() })
  },

  openDocument: (id) => {
    const document = getLibraryDocument(id)
    if (!document) return
    saveDocument(document)
    set({
      document,
      library: loadLibrary(),
      selectedNodeId: getRootNode(document.nodes)?.id ?? null,
      editingNodeId: null,
      lastAddedNodeIds: [],
      insightPanelOpen: false,
      insights: [],
      clarification: null,
      analysisError: null,
      analysisStatus: 'idle',
      past: [],
      future: [],
      saveStatus: 'saved',
    })
  },

  closeDocument: () => {
    const { document } = get()
    if (document) saveDocument(document)
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    set({
      document: null,
      selectedNodeId: null,
      editingNodeId: null,
      lastAddedNodeIds: [],
      insightPanelOpen: false,
      insights: [],
      clarification: null,
      analysisError: null,
      analysisStatus: 'idle',
      past: [],
      future: [],
      saveStatus: 'idle',
      library: loadLibrary(),
    })
  },

  remember: () => {
    const { document } = get()
    if (!document) return
    set((state) => ({
      past: pushSnapshot(state.past, snapshotOf(document)),
      future: [],
    }))
  },

  renameDocument: (id, title) => {
    const trimmed = title.trim()
    if (!trimmed) return false
    const document = getLibraryDocument(id)
    if (!document) return false
    const root = getRootNode(document.nodes)
    const next: MindMapDocument = {
      ...document,
      title: trimmed,
      updatedAt: now(),
      nodes: root
        ? document.nodes.map((node) =>
            node.id === root.id
              ? { ...node, data: { ...node.data, label: trimmed, updatedAt: now() } }
              : node,
          )
        : document.nodes,
    }
    updateLibraryDocument(next)
    const current = get().document
    set({
      library: loadLibrary(),
      document: current?.id === id ? next : current,
    })
    return true
  },

  deleteDocument: (id) => {
    deleteLibraryDocument(id)
    const current = get().document
    if (current?.id !== id) {
      set({ library: loadLibrary() })
      return
    }
    set({
      document: null,
      selectedNodeId: null,
      editingNodeId: null,
      lastAddedNodeIds: [],
      insightPanelOpen: false,
      insights: [],
      clarification: null,
      analysisError: null,
      analysisStatus: 'idle',
      past: [],
      future: [],
      saveStatus: 'idle',
      library: loadLibrary(),
    })
  },

  setDocumentPassword: async (id, password, currentPassword) => {
    const document = getLibraryDocument(id)
    if (!document) return '생각을 찾지 못했습니다.'
    if (password.length < 4) return '비밀번호는 4자 이상이어야 합니다.'
    if (document.passwordHash) {
      const matches = await documentPasswordMatches(id, currentPassword ?? '', document.passwordHash)
      if (!matches) return '현재 비밀번호가 올바르지 않습니다.'
    }
    const passwordHash = await hashDocumentPassword(id, password)
    const next = { ...document, passwordHash, updatedAt: now() }
    updateLibraryDocument(next)
    const current = get().document
    set({
      library: loadLibrary(),
      document: current?.id === id ? next : current,
    })
    return null
  },

  clearDocumentPassword: async (id, currentPassword) => {
    const document = getLibraryDocument(id)
    if (!document) return '생각을 찾지 못했습니다.'
    if (!document.passwordHash) return null
    const matches = await documentPasswordMatches(id, currentPassword, document.passwordHash)
    if (!matches) return '현재 비밀번호가 올바르지 않습니다.'
    const next = { ...document, passwordHash: undefined, updatedAt: now() }
    updateLibraryDocument(next)
    const current = get().document
    set({
      library: loadLibrary(),
      document: current?.id === id ? next : current,
    })
    return null
  },

  verifyDocumentPassword: async (id, password) => {
    const document = getLibraryDocument(id)
    if (!document) return false
    return documentPasswordMatches(id, password, document.passwordHash)
  },

  startDocument: (title) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const document = createDocument(trimmed)
    set({
      document,
      selectedNodeId: document.nodes[0]?.id ?? null,
      editingNodeId: null,
      lastAddedNodeIds: document.nodes.map((node) => node.id),
      insightPanelOpen: false,
      insights: [],
      clarification: null,
      analysisError: null,
      past: [],
      future: [],
      saveStatus: saveDocument(document),
      library: loadLibrary(),
    })
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  setEditingNode: (id) => set({ editingNodeId: id }),
  clearLastAdded: () => set({ lastAddedNodeIds: [] }),

  addChild: (label = '새 생각', parentId) => {
    const { document, selectedNodeId } = get()
    if (!document) return null
    const parent =
      document.nodes.find((node) => node.id === (parentId ?? selectedNodeId)) ??
      getRootNode(document.nodes)
    if (!parent) return null
    get().remember()
    const siblings = document.nodes.filter((node) => node.data.parentId === parent.id)
    const child = createHumanNode(
      label,
      placeChildPosition(parent, siblings),
      parent.id,
    )
    const edge = createEdge(parent.id, child.id, 'human')
    const next: MindMapDocument = {
      ...document,
      nodes: [...document.nodes, child],
      edges: [...document.edges, edge],
      updatedAt: now(),
    }
    set({
      document: next,
      selectedNodeId: child.id,
      editingNodeId: child.id,
      lastAddedNodeIds: [child.id],
    })
    get().persistSoon()
    return child.id
  },

  updateLabel: (id, label) => {
    const { document } = get()
    if (!document) return
    const current = document.nodes.find((node) => node.id === id)
    if (!current || current.data.label === label) return
    get().remember()
    const next: MindMapDocument = {
      ...document,
      title: current.data.parentId ? document.title : label.trim() || document.title,
      nodes: document.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                label: label.trim() || node.data.label,
                updatedAt: now(),
                editedByUser: node.data.origin === 'ai' ? true : node.data.editedByUser,
              },
            }
          : node,
      ),
      updatedAt: now(),
    }
    set({ document: next, editingNodeId: null })
    get().persistSoon()
  },

  deleteSelected: () => {
    const { document, selectedNodeId, editingNodeId } = get()
    if (!document || !selectedNodeId || editingNodeId) return
    const root = getRootNode(document.nodes)
    if (!root || selectedNodeId === root.id) return
    get().remember()
    const removeIds = collectSubtreeIds(document.nodes, selectedNodeId)
    const next: MindMapDocument = {
      ...document,
      nodes: document.nodes.filter((node) => !removeIds.has(node.id)),
      edges: document.edges.filter(
        (edge) => !removeIds.has(edge.source) && !removeIds.has(edge.target),
      ),
      updatedAt: now(),
    }
    set({
      document: next,
      selectedNodeId: root.id,
      lastAddedNodeIds: [],
    })
    get().persistSoon()
  },

  applyNodeChanges: (changes) => {
    const { document } = get()
    if (!document) return
    const nextNodes = applyNodeChanges(changes, document.nodes)
    const selected = changes.find((change) => change.type === 'select' && change.selected)
    set({
      document: {
        ...document,
        nodes: nextNodes,
        updatedAt: now(),
      },
      selectedNodeId: selected && 'id' in selected ? selected.id : get().selectedNodeId,
    })
    const moved = changes.some((change) => change.type === 'position' && !change.dragging)
    if (moved) get().persistSoon()
  },

  setViewport: (viewport) => {
    const { document } = get()
    if (!document) return
    set({
      document: { ...document, viewport, updatedAt: now() },
    })
    get().persistSoon()
  },

  undo: () => {
    const { document, past } = get()
    if (!document || past.length === 0) return
    const previous = past[past.length - 1]
    if (!previous) return
    set({
      document: {
        ...document,
        nodes: previous.nodes,
        edges: previous.edges,
        dismissedInsightTitles: previous.dismissedInsightTitles,
        updatedAt: now(),
      },
      past: past.slice(0, -1),
      future: [cloneSnapshot(snapshotOf(document)), ...get().future],
    })
    get().persistSoon()
  },

  redo: () => {
    const { document, future } = get()
    if (!document || future.length === 0) return
    const next = future[0]
    if (!next) return
    set({
      document: {
        ...document,
        nodes: next.nodes,
        edges: next.edges,
        dismissedInsightTitles: next.dismissedInsightTitles,
        updatedAt: now(),
      },
      past: pushSnapshot(get().past, snapshotOf(document)),
      future: future.slice(1),
    })
    get().persistSoon()
  },

  closeInsightPanel: () =>
    set({
      insightPanelOpen: false,
      analysisError: null,
    }),

  findBlindSpots: async () => {
    await runAnalysis(set, get, 'find_blind_spots')
  },

  rethink: async () => {
    await runAnalysis(set, get, 'rethink')
  },

  answerClarification: async (option) => {
    set({ clarificationAnswer: option, clarification: null })
    await runAnalysis(set, get, 'find_blind_spots', option)
  },

  acceptInsight: (insight, edits) => {
    const { document } = get()
    if (!document) return
    const title = (edits?.title ?? insight.title).trim()
    const content = (edits?.content ?? insight.content).trim()
    if (
      isDuplicateTitle(title, [
        ...document.nodes.map((node) => node.data.label),
        ...document.dismissedInsightTitles,
      ])
    ) {
      set({
        insights: get().insights.filter((item) => item.id !== insight.id),
      })
      return
    }
    get().remember()
    const parentId =
      pickParentId(insight.basedOnNodeIds, document.nodes) ??
      getRootNode(document.nodes)?.id
    const parent = document.nodes.find((node) => node.id === parentId)
    if (!parent) return
    const siblings = document.nodes.filter((node) => node.data.parentId === parent.id)
    const createdAt = now()
    const node: MindNode = {
      id: nanoid(),
      type: 'ai',
      position: placeChildPosition(parent, siblings, { isAi: true }),
      data: {
        label: title,
        origin: 'ai',
        parentId: parent.id,
        createdAt,
        updatedAt: createdAt,
        aiType: insight.type,
        aiContent: content,
        rationale: insight.rationale,
        gap: insight.gap,
        basedOnNodeIds: insight.basedOnNodeIds.filter((id) =>
          document.nodes.some((item) => item.id === id),
        ),
        questions: insight.questions,
        actions: insight.actions,
        acceptedByUser: true,
        editedByUser: Boolean(edits),
      },
    }
    const next: MindMapDocument = {
      ...document,
      nodes: [...document.nodes, node],
      edges: [...document.edges, createEdge(parent.id, node.id, 'ai')],
      updatedAt: createdAt,
    }
    set({
      document: next,
      selectedNodeId: node.id,
      lastAddedNodeIds: [node.id],
      insights: get().insights.filter((item) => item.id !== insight.id),
    })
    get().persistSoon()
  },

  dismissInsight: (insight) => {
    const { document } = get()
    if (!document) return
    set({
      document: {
        ...document,
        dismissedInsightTitles: [...document.dismissedInsightTitles, insight.title],
        updatedAt: now(),
      },
      insights: get().insights.filter((item) => item.id !== insight.id),
    })
    get().persistSoon()
  },

  startElaboration: async (nodeId) => {
    const { document } = get()
    if (!document) return
    const node = document.nodes.find((item) => item.id === nodeId)
    if (!node || node.data.aiType !== 'agenda') return
    set({
      elaborationNodeId: nodeId,
      elaborationStatus: 'loading',
      elaboration: null,
      elaborationItems: [],
      selectedElaborationIds: [],
      insightPanelOpen: true,
    })
    try {
      const basedOnLabels = (node.data.basedOnNodeIds ?? [])
        .map((id) => document.nodes.find((item) => item.id === id)?.data.label)
        .filter((label): label is string => Boolean(label))
      const result = await elaborateInsight({
        title: node.data.label,
        content: node.data.aiContent ?? node.data.label,
        basedOnLabels,
      })
      const items = elaborationItems(result)
      set({
        elaboration: result,
        elaborationItems: items,
        selectedElaborationIds: items.map((item) => item.id),
        elaborationStatus: 'idle',
      })
    } catch (error) {
      set({
        elaborationStatus: 'error',
        analysisError: error instanceof Error ? error.message : AI_ERROR_MESSAGE,
      })
    }
  },

  toggleElaborationItem: (id) => {
    const { selectedElaborationIds } = get()
    set({
      selectedElaborationIds: selectedElaborationIds.includes(id)
        ? selectedElaborationIds.filter((item) => item !== id)
        : [...selectedElaborationIds, id],
    })
  },

  applyElaboration: () => {
    const { document, elaborationNodeId, elaborationItems, selectedElaborationIds } =
      get()
    if (!document || !elaborationNodeId) return
    const parent = document.nodes.find((node) => node.id === elaborationNodeId)
    if (!parent) return
    const selected = elaborationItems.filter((item) =>
      selectedElaborationIds.includes(item.id),
    )
    if (selected.length === 0) return
    get().remember()
    const created: MindNode[] = []
    const edges: MindEdge[] = []
    let siblings = document.nodes.filter((node) => node.data.parentId === parent.id)
    for (const item of selected) {
      const createdAt = now()
      const node: MindNode = {
        id: nanoid(),
        type: 'ai',
        position: placeChildPosition(parent, [...siblings, ...created], { isAi: true }),
        data: {
          label: item.label,
          origin: 'ai',
          parentId: parent.id,
          createdAt,
          updatedAt: createdAt,
          aiType:
            item.category === 'purpose'
              ? 'agenda'
              : item.category === 'check' || item.category === 'material'
                ? 'question'
                : 'action',
          acceptedByUser: true,
        },
      }
      created.push(node)
      edges.push(createEdge(parent.id, node.id, 'ai'))
    }
    set({
      document: {
        ...document,
        nodes: [...document.nodes, ...created],
        edges: [...document.edges, ...edges],
        updatedAt: now(),
      },
      lastAddedNodeIds: created.map((node) => node.id),
      elaborationNodeId: null,
      elaboration: null,
      elaborationItems: [],
      selectedElaborationIds: [],
    })
    get().persistSoon()
  },

  closeElaboration: () =>
    set({
      elaborationNodeId: null,
      elaboration: null,
      elaborationItems: [],
      selectedElaborationIds: [],
      elaborationStatus: 'idle',
    }),
}))

async function runAnalysis(
  set: (partial: Partial<MindMapState>) => void,
  get: () => MindMapState,
  requestType: 'find_blind_spots' | 'rethink',
  clarificationAnswer?: string,
) {
  const { document, selectedNodeId, insights } = get()
  if (!document || !canActivateAi(document.nodes)) return

  const selected = selectedNodeId
    ? document.nodes.find((node) => node.id === selectedNodeId)
    : undefined
  const focusId = selected ? selected.id : null

  set({
    insightPanelOpen: true,
    analysisStatus: 'loading',
    analysisError: null,
    clarification: null,
    analysisScopeLabel: describeScope(document.nodes, focusId),
  })

  try {
    const payload = buildAnalysisPayload(
      document,
      focusId,
      requestType,
      insights.map((insight) => insight.title),
      clarificationAnswer ?? get().clarificationAnswer ?? undefined,
    )
    const response = await Promise.race([
      analyzeThoughts(payload),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 8000)
      }),
    ]).catch(() => getMockAnalysis(payload))
    const blocked = [
      ...document.nodes.map((node) => node.data.label),
      ...document.dismissedInsightTitles,
      ...insights.map((insight) => insight.title),
    ]
    const nextInsights = response.insights.filter(
      (insight) => !isDuplicateTitle(insight.title, blocked),
    )
    set({
      analysisStatus: 'idle',
      analysisSummary: response.analysisSummary,
      insights: nextInsights,
      clarification: nextInsights.length === 0 ? response.clarification : null,
    })
  } catch (error) {
    set({
      analysisStatus: 'error',
      analysisError: error instanceof Error ? error.message : AI_ERROR_MESSAGE,
    })
  }
}

export function resetMindMapStore(): void {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  useMindMapStore.setState({
    document: null,
    selectedNodeId: null,
    editingNodeId: null,
    lastAddedNodeIds: [],
    saveStatus: 'idle',
    insightPanelOpen: false,
    analysisStatus: 'idle',
    analysisError: null,
    analysisSummary: '',
    analysisScopeLabel: '',
    insights: [],
    clarification: null,
    clarificationAnswer: null,
    elaborationNodeId: null,
    elaboration: null,
    elaborationItems: [],
    selectedElaborationIds: [],
    elaborationStatus: 'idle',
    past: [],
    future: [],
    library: [],
  })
}
