import { describe, expect, it } from 'vitest'
import type { AnalysisPayload } from '../types/mindmap.ts'
import { getMockAnalysis, isDemoPolicyMap } from './mockAi.ts'

const terminalPayload: AnalysisPayload = {
  topic: '이번 회의 안건',
  scope: { type: 'branch', focusNodeId: 'n3' },
  nodes: [
    { id: 'n1', label: '이번 회의 안건', origin: 'human', parentId: null },
    { id: 'n2', label: 'AI를 터미널로 돌려도 될까', origin: 'human', parentId: 'n1' },
    { id: 'n3', label: '있어보이려고.', origin: 'human', parentId: 'n2' },
  ],
  paths: [['이번 회의 안건', 'AI를 터미널로 돌려도 될까', '있어보이려고.']],
  humanPaths: [['이번 회의 안건', 'AI를 터미널로 돌려도 될까', '있어보이려고.']],
  existingInsights: [],
  requestType: 'find_blind_spots',
  contextRule: 'full',
}

describe('getMockAnalysis', () => {
  it('소상공인과 무관한 생각에는 소상공인 예시를 쓰지 않는다', () => {
    expect(isDemoPolicyMap(terminalPayload)).toBe(false)
    const result = getMockAnalysis(terminalPayload)
    const text = JSON.stringify(result)
    expect(text).not.toContain('소상공인')
    expect(text).toContain('있어보이려고')
    expect(result.insights[0]?.content.length).toBeGreaterThan(15)
  })
})
