import { describe, expect, it } from 'vitest'
import type { MindNode } from '../types/mindmap.ts'
import { canActivateAi, placeChildPosition } from './nodePlacement.ts'

function node(id: string, x: number, y: number, parentId?: string): MindNode {
  return {
    id,
    type: 'human',
    position: { x, y },
    data: {
      label: id,
      origin: 'human',
      parentId,
      createdAt: 't',
      updatedAt: 't',
    },
  }
}

describe('nodePlacement', () => {
  it('기존 노드 위치를 바꾸지 않고 빈 자리에 놓는다', () => {
    const parent = node('root', 80, 180)
    const child = node('a', 392, 180, 'root')
    const next = placeChildPosition(parent, [child])
    expect(parent.position).toEqual({ x: 80, y: 180 })
    expect(child.position).toEqual({ x: 392, y: 180 })
    expect(next).not.toEqual(child.position)
  })

  it('하위 노드가 2개 미만이면 AI를 켜지 않는다', () => {
    expect(canActivateAi([node('root', 0, 0)])).toBe(false)
    expect(canActivateAi([node('root', 0, 0), node('a', 1, 1, 'root')])).toBe(false)
    expect(
      canActivateAi([
        node('root', 0, 0),
        node('a', 1, 1, 'root'),
        node('b', 1, 2, 'a'),
      ]),
    ).toBe(true)
  })
})
