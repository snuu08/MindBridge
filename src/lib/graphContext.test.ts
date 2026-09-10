import { describe, expect, it } from 'vitest'
import type { MindMapDocument } from '../types/mindmap.ts'
import { buildAnalysisPayload, describeScope } from './graphContext.ts'

const document: MindMapDocument = {
  version: 2,
  id: 'doc',
  title: '이번 회의 안건',
  createdAt: 't',
  updatedAt: 't',
  dismissedInsightTitles: [],
  nodes: [
    {
      id: 'node-root',
      type: 'human',
      position: { x: 0, y: 0 },
      data: {
        label: '이번 회의 안건',
        origin: 'human',
        createdAt: 't',
        updatedAt: 't',
      },
    },
    {
      id: 'node-policy',
      type: 'human',
      position: { x: 1, y: 0 },
      data: {
        label: '성남시 정책',
        origin: 'human',
        parentId: 'node-root',
        createdAt: 't',
        updatedAt: 't',
      },
    },
    {
      id: 'node-small-business',
      type: 'human',
      position: { x: 2, y: 0 },
      data: {
        label: '소상공인 지원',
        origin: 'human',
        parentId: 'node-policy',
        createdAt: 't',
        updatedAt: 't',
      },
    },
    {
      id: 'node-youth',
      type: 'human',
      position: { x: 2, y: 1 },
      data: {
        label: '청년 주거',
        origin: 'human',
        parentId: 'node-root',
        createdAt: 't',
        updatedAt: 't',
      },
    },
  ],
  edges: [],
}

describe('graphContext', () => {
  it('평면 배열이 아니라 구조와 출처를 보낸다', () => {
    const payload = buildAnalysisPayload(document, 'node-small-business', 'find_blind_spots')
    expect(payload.topic).toBe('이번 회의 안건')
    expect(payload.scope).toEqual({ type: 'branch', focusNodeId: 'node-small-business' })
    expect(payload.nodes.map((node) => node.origin)).toContain('human')
    expect(payload.nodes.map((node) => node.label)).toContain('청년 주거')
    expect(payload.humanPaths).toEqual(
      expect.arrayContaining([
        ['이번 회의 안건', '성남시 정책', '소상공인 지원'],
        ['이번 회의 안건', '청년 주거'],
      ]),
    )
    expect(payload.contextRule).toContain('중심 주제부터')
  })

  it('분석 범위를 한국어로 표시한다', () => {
    expect(describeScope(document.nodes, null)).toContain('전체를 이어서 분석 중')
    expect(describeScope(document.nodes, 'node-small-business')).toContain('소상공인 지원')
    expect(describeScope(document.nodes, 'node-small-business')).toContain('청년 주거')
  })
})
