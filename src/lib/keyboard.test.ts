import { describe, expect, it } from 'vitest'
import { shouldIgnoreNodeDelete } from './keyboard.ts'

describe('shouldIgnoreNodeDelete', () => {
  it('입력 중 Backspace는 노드를 지우지 않는다', () => {
    const input = document.createElement('input')
    expect(shouldIgnoreNodeDelete(input)).toBe(true)
  })

  it('캔버스에서는 삭제 단축키를 허용한다', () => {
    const button = document.createElement('button')
    expect(shouldIgnoreNodeDelete(button)).toBe(false)
  })
})
