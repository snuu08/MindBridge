import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './authErrors.ts'

describe('authErrorMessage', () => {
  it('잘못된 로그인 정보를 한국어로 바꾼다', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    )
  })

  it('이미 가입된 이메일을 한국어로 바꾼다', () => {
    expect(authErrorMessage({ message: 'User already registered' })).toBe(
      '이미 가입된 이메일입니다. 로그인해 주세요.',
    )
  })

  it('같은 비밀번호로 바꾸려 하면 알려준다', () => {
    expect(
      authErrorMessage({
        code: 'same_password',
        message: 'New password should be different from the old password.',
      }),
    ).toBe('지금 쓰는 비밀번호와 다른 비밀번호를 입력하세요.')
  })
})
