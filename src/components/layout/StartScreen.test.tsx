import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMindMapStore, useMindMapStore } from '../../store/useMindMapStore.ts'
import { StartScreen } from './StartScreen.tsx'

vi.mock('../../lib/supabase.ts', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn(),
    },
  },
}))

describe('StartScreen', () => {
  beforeEach(() => {
    resetMindMapStore()
    localStorage.clear()
  })

  it('예시 주제로 문서를 시작한다', async () => {
    const user = userEvent.setup()
    render(<StartScreen />)
    expect(screen.getByText('먼저 생각을 적으면, AI가 놓친 부분을 함께 생각합니다.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '이번 회의 안건' }))
    expect(useMindMapStore.getState().document?.title).toBe('이번 회의 안건')
  })
})
