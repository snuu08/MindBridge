import { describe, expect, it } from 'vitest'
import { MOCK_ANALYSIS } from '../lib/mockAi.ts'
import { AnalysisResponseSchema } from './insightSchema.ts'

describe('AnalysisResponseSchema', () => {
  it('Mock 응답이 스키마를 통과한다', () => {
    expect(AnalysisResponseSchema.parse(MOCK_ANALYSIS).insights).toHaveLength(3)
  })
})
