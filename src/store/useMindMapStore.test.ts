import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setMockAiForTests } from '../lib/api.ts'
import { canActivateAi } from '../lib/nodePlacement.ts'
import { resetMindMapStore, useMindMapStore } from './useMindMapStore.ts'
import { STORAGE_KEY } from './migration.ts'

function meetingTree() {
  const store = useMindMapStore.getState()
  store.startDocument('이번 회의 안건')
  const rootId = useMindMapStore.getState().document?.nodes[0]?.id
  store.addChild('성남시 정책', rootId)
  const policyId = useMindMapStore.getState().selectedNodeId
  store.addChild('소상공인 지원', policyId ?? undefined)
}

describe('MindBridge store flow', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMindMapStore()
    setMockAiForTests(true)
  })

  afterEach(() => {
    setMockAiForTests(null)
    resetMindMapStore()
    localStorage.clear()
  })

  it('이번 회의 안건으로 새 문서를 시작한다', () => {
    useMindMapStore.getState().startDocument('이번 회의 안건')
    const document = useMindMapStore.getState().document
    expect(document?.title).toBe('이번 회의 안건')
    expect(document?.nodes[0]?.data.label).toBe('이번 회의 안건')
    expect(document?.nodes[0]?.data.origin).toBe('human')
  })

  it('성남시 정책과 소상공인 지원을 직접 추가한다', () => {
    meetingTree()
    const labels = useMindMapStore.getState().document?.nodes.map((node) => node.data.label)
    expect(labels).toEqual(['이번 회의 안건', '성남시 정책', '소상공인 지원'])
    expect(
      useMindMapStore.getState().document?.nodes.every((node) => node.data.origin === 'human'),
    ).toBe(true)
  })

  it('하위 노드가 2개 미만이면 AI가 비활성이다', () => {
    useMindMapStore.getState().startDocument('이번 회의 안건')
    const rootId = useMindMapStore.getState().document?.nodes[0]?.id
    expect(canActivateAi(useMindMapStore.getState().document?.nodes ?? [])).toBe(false)
    useMindMapStore.getState().addChild('성남시 정책', rootId)
    expect(canActivateAi(useMindMapStore.getState().document?.nodes ?? [])).toBe(false)
    useMindMapStore.getState().addChild('소상공인 지원')
    expect(canActivateAi(useMindMapStore.getState().document?.nodes ?? [])).toBe(true)
  })

  it('AI 제안은 자동으로 추가되지 않고 완성된 안건이다', async () => {
    meetingTree()
    const before = useMindMapStore.getState().document?.nodes.length
    await useMindMapStore.getState().findBlindSpots()
    const state = useMindMapStore.getState()
    expect(state.document?.nodes.length).toBe(before)
    expect(state.insights.length).toBeGreaterThan(0)
    expect(state.insights[0]?.title).toBe('소상공인 지원정책 모니터링')
    expect(state.insights[0]?.content.length ?? 0).toBeGreaterThan(15)
    expect(state.insights.some((insight) => insight.title === '지역경제')).toBe(false)
  })

  it('추가한 제안만 AI 노드가 되고 수정 추가와 참고 노드를 남긴다', async () => {
    meetingTree()
    await useMindMapStore.getState().findBlindSpots()
    const insight = useMindMapStore.getState().insights[0]
    expect(insight).toBeTruthy()
    if (!insight) return
    useMindMapStore.getState().acceptInsight(insight, {
      title: '소상공인 지원정책 모니터링',
      content: '이용 과정을 점검한다',
    })
    const aiNodes = useMindMapStore.getState().document?.nodes.filter((node) => node.data.origin === 'ai')
    expect(aiNodes).toHaveLength(1)
    expect(aiNodes?.[0]?.data.editedByUser).toBe(true)
    expect(aiNodes?.[0]?.data.origin).toBe('ai')
    expect(aiNodes?.[0]?.data.basedOnNodeIds?.length).toBeGreaterThan(0)
  })

  it('다시 생각하기는 기존 제안을 반복하지 않는다', async () => {
    meetingTree()
    await useMindMapStore.getState().findBlindSpots()
    const first = useMindMapStore.getState().insights.map((insight) => insight.title)
    await useMindMapStore.getState().rethink()
    const second = useMindMapStore.getState().insights.map((insight) => insight.title)
    expect(second.some((title) => first.includes(title))).toBe(false)
  })

  it('중복 제안은 노드로 넣지 않는다', async () => {
    meetingTree()
    await useMindMapStore.getState().findBlindSpots()
    const insight = useMindMapStore.getState().insights[0]
    if (!insight) return
    useMindMapStore.getState().acceptInsight(insight)
    const count = useMindMapStore.getState().document?.nodes.length
    useMindMapStore.getState().acceptInsight(insight)
    expect(useMindMapStore.getState().document?.nodes.length).toBe(count)
  })

  it('선택한 구체화 항목만 추가한다', async () => {
    meetingTree()
    await useMindMapStore.getState().findBlindSpots()
    const insight = useMindMapStore.getState().insights.find((item) => item.type === 'agenda')
    if (!insight) throw new Error('agenda missing')
    useMindMapStore.getState().acceptInsight(insight)
    const agendaId = useMindMapStore
      .getState()
      .document?.nodes.find((node) => node.data.aiType === 'agenda')?.id
    if (!agendaId) throw new Error('agenda node missing')
    await useMindMapStore.getState().startElaboration(agendaId)
    const items = useMindMapStore.getState().elaborationItems
    expect(items.length).toBeGreaterThan(3)
    const keep = items[0]
    if (!keep) throw new Error('item missing')
    useMindMapStore.setState({ selectedElaborationIds: [keep.id] })
    const before = useMindMapStore.getState().document?.nodes.length ?? 0
    useMindMapStore.getState().applyElaboration()
    const after = useMindMapStore.getState().document?.nodes ?? []
    expect(after.length).toBe(before + 1)
    expect(after.some((node) => node.data.label === keep.label)).toBe(true)
  })

  it('새로고침 후에도 마인드맵을 복구한다', () => {
    meetingTree()
    const snapshot = useMindMapStore.getState().document
    if (!snapshot) throw new Error('missing document')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    resetMindMapStore()
    useMindMapStore.getState().hydrate()
    expect(useMindMapStore.getState().document?.nodes.map((node) => node.data.label)).toEqual([
      '이번 회의 안건',
      '성남시 정책',
      '소상공인 지원',
    ])
  })

  it('AI 오류가 나도 사용자 데이터는 남는다', async () => {
    meetingTree()
    const before = useMindMapStore.getState().document
    setMockAiForTests(false)
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'))
    await useMindMapStore.getState().findBlindSpots()
    expect(useMindMapStore.getState().document?.nodes).toEqual(before?.nodes)
    expect(useMindMapStore.getState().insights.length).toBeGreaterThan(0)
    setMockAiForTests(null)
  })

  it('기존 노드는 새 노드 추가 때문에 움직이지 않는다', () => {
    meetingTree()
    const before = useMindMapStore
      .getState()
      .document?.nodes.map((node) => ({ id: node.id, position: { ...node.position } }))
    useMindMapStore.getState().addChild('추가 생각')
    const after = useMindMapStore.getState().document?.nodes ?? []
    for (const prev of before ?? []) {
      const current = after.find((node) => node.id === prev.id)
      expect(current?.position).toEqual(prev.position)
    }
  })

  it('새 생각을 시작해도 예전 생각은 목록에 남는다', () => {
    useMindMapStore.getState().startDocument('이번 회의 안건')
    useMindMapStore.getState().addChild('있어보이려고')
    useMindMapStore.getState().persistNow()
    const firstId = useMindMapStore.getState().document?.id
    useMindMapStore.getState().startDocument('새로운 행사 아이디어')
    const titles = useMindMapStore.getState().library.map((item) => item.title)
    expect(titles).toContain('이번 회의 안건')
    expect(titles).toContain('새로운 행사 아이디어')
    useMindMapStore.getState().openDocument(firstId ?? '')
    expect(useMindMapStore.getState().document?.title).toBe('이번 회의 안건')
    expect(
      useMindMapStore.getState().document?.nodes.some((node) => node.data.label === '있어보이려고'),
    ).toBe(true)
  })

  it('목록에서 제목을 바꾸고 비밀번호를 걸 수 있다', async () => {
    useMindMapStore.getState().startDocument('이번 회의 안건')
    const id = useMindMapStore.getState().document?.id
    expect(id).toBeTruthy()
    expect(useMindMapStore.getState().renameDocument(id ?? '', '바꾼 제목')).toBe(true)
    expect(useMindMapStore.getState().library[0]?.title).toBe('바꾼 제목')
    const setError = await useMindMapStore.getState().setDocumentPassword(id ?? '', 'lock')
    expect(setError).toBeNull()
    expect(await useMindMapStore.getState().verifyDocumentPassword(id ?? '', 'lock')).toBe(true)
    expect(await useMindMapStore.getState().verifyDocumentPassword(id ?? '', 'wrong')).toBe(false)
    useMindMapStore.getState().deleteDocument(id ?? '')
    expect(useMindMapStore.getState().library).toHaveLength(0)
  })

  it('실행취소는 노드 추가를 되돌린다', () => {
    useMindMapStore.getState().startDocument('이번 회의 안건')
    const rootId = useMindMapStore.getState().document?.nodes[0]?.id
    useMindMapStore.getState().addChild('성남시 정책', rootId)
    expect(useMindMapStore.getState().document?.nodes).toHaveLength(2)
    useMindMapStore.getState().undo()
    expect(useMindMapStore.getState().document?.nodes).toHaveLength(1)
  })
})
