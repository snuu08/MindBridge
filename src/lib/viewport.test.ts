import { describe, expect, it } from 'vitest'
import { shouldAutoFitView } from './viewport.ts'

describe('shouldAutoFitView', () => {
  it('전체 보기 요청이면 항상 맞춘다', () => {
    expect(
      shouldAutoFitView({
        reason: 'user',
        previousWidth: 100,
        nextWidth: 100,
        previousHeight: 100,
        nextHeight: 100,
      }),
    ).toBe(true)
  })

  it('새 노드가 화면 밖일 때만 맞춘다', () => {
    expect(
      shouldAutoFitView({
        reason: 'new-node',
        newNodeOutside: false,
        previousWidth: 100,
        nextWidth: 110,
        previousHeight: 100,
        nextHeight: 110,
      }),
    ).toBe(false)
    expect(
      shouldAutoFitView({
        reason: 'new-node',
        newNodeOutside: true,
        previousWidth: 100,
        nextWidth: 110,
        previousHeight: 100,
        nextHeight: 110,
      }),
    ).toBe(true)
  })

  it('경계가 15% 이상 커지면 맞춘다', () => {
    expect(
      shouldAutoFitView({
        reason: 'bounds',
        previousWidth: 100,
        nextWidth: 116,
        previousHeight: 100,
        nextHeight: 100,
      }),
    ).toBe(true)
  })
})
