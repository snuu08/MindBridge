import { describe, expect, it } from 'vitest'
import { isDuplicateTitle, normalizeTitle } from './duplicateDetection.ts'

describe('duplicateDetection', () => {
  it('정규화하면 공백과 특수문자를 무시한다', () => {
    expect(normalizeTitle(' 소상공인 지원! ')).toBe(normalizeTitle('소상공인지원'))
  })

  it('의미가 같은 제목을 중복으로 본다', () => {
    expect(isDuplicateTitle('소상공인 지원정책 모니터링', ['소상공인 지원정책 모니터링'])).toBe(
      true,
    )
  })
})
