import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../lib/supabase.ts'
import { ForgotPasswordPage } from './ForgotPasswordPage.tsx'
import { LoginPage } from './LoginPage.tsx'
import { SignupPage } from './SignupPage.tsx'
import { UpdatePasswordPage } from './UpdatePasswordPage.tsx'

vi.mock('../../lib/supabase.ts', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

describe('auth UI', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
    vi.mocked(supabase.auth.signUp).mockReset()
    vi.mocked(supabase.auth.signOut).mockReset()
    vi.mocked(supabase.auth.resetPasswordForEmail).mockReset()
    vi.mocked(supabase.auth.updateUser).mockReset()
  })

  it('로그인 화면에서 이메일과 비밀번호를 보낸다', async () => {
    const user = userEvent.setup()
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: {} as never, user: {} as never },
      error: null,
    })
    render(<LoginPage onGoSignup={vi.fn()} onForgotPassword={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'a@b.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    })
  })

  it('로그인 실패를 한국어로 보여준다', async () => {
    const user = userEvent.setup()
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', name: 'AuthApiError', status: 400 } as never,
    })
    render(<LoginPage onGoSignup={vi.fn()} onForgotPassword={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'a@b.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
  })

  it('회원가입이 끝나면 세션을 닫고 로그인으로 보낸다', async () => {
    const user = userEvent.setup()
    const onSignedUp = vi.fn()
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { session: {} as never, user: {} as never },
      error: null,
    })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
    render(<SignupPage onGoLogin={vi.fn()} onSignedUp={onSignedUp} />)
    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'a@b.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret')
    await user.click(screen.getByRole('button', { name: '회원가입' }))
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
      options: {
        data: { name: '홍길동' },
        emailRedirectTo: window.location.origin,
      },
    })
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(onSignedUp).toHaveBeenCalledWith({ needsEmailConfirm: false })
  })

  it('비밀번호가 다르면 가입하지 않는다', async () => {
    const user = userEvent.setup()
    render(<SignupPage onGoLogin={vi.fn()} onSignedUp={vi.fn()} />)
    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'a@b.com')
    await user.type(screen.getByLabelText('비밀번호'), 'secret1')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret2')
    await user.click(screen.getByRole('button', { name: '회원가입' }))
    expect(screen.getByText('비밀번호가 서로 다릅니다.')).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('비밀번호 찾기 메일을 보낸다', async () => {
    const user = userEvent.setup()
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    })
    render(<ForgotPasswordPage onGoLogin={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: '재설정 메일 보내기' }))
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: window.location.origin,
    })
    expect(
      await screen.findByText(
        '해당 이메일이 가입되어 있다면 재설정 메일을 보냈습니다. 받은 편지함을 확인해 주세요.',
      ),
    ).toBeInTheDocument()
  })

  it('새 비밀번호를 저장한 뒤 로그아웃한다', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: {} as never },
      error: null,
    })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
    render(<UpdatePasswordPage onUpdated={onUpdated} onGoHome={vi.fn()} />)
    await user.type(screen.getByLabelText('새 비밀번호'), 'newpass')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpass')
    await user.click(screen.getByRole('button', { name: '비밀번호 바꾸기' }))
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass' })
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(onUpdated).toHaveBeenCalled()
  })
})
