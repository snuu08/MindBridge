import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMindMapStore, useMindMapStore } from '../../store/useMindMapStore.ts'
import { HomePage } from './HomePage.tsx'

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

describe('HomePage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    localStorage.clear()
    resetMindMapStore()
  })

  it('저장된 생각이 없으면 새로 시작한다', async () => {
    const user = userEvent.setup()
    const onStartNew = vi.fn()
    render(<HomePage onStartNew={onStartNew} onOpenDocument={vi.fn()} />)
    expect(screen.getByText('여태까지 했던 생각')).toBeInTheDocument()
    expect(screen.getByText('아직 저장된 생각이 없습니다.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '새 생각 시작하기' }))
    expect(onStartNew).toHaveBeenCalled()
  })

  it('여태까지 했던 생각을 나열하고 고를 수 있다', async () => {
    const user = userEvent.setup()
    const onOpenDocument = vi.fn()
    useMindMapStore.getState().startDocument('이번 회의 안건')
    const firstId = useMindMapStore.getState().document?.id
    useMindMapStore.getState().addChild('있어보이려고')
    useMindMapStore.getState().persistNow()
    useMindMapStore.getState().startDocument('새로운 행사 아이디어')
    render(<HomePage onStartNew={vi.fn()} onOpenDocument={onOpenDocument} />)
    expect(screen.getByRole('button', { name: /이번 회의 안건/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /새로운 행사 아이디어/ })).toBeInTheDocument()
    expect(screen.getByText('있어보이려고')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /이번 회의 안건/ }))
    expect(onOpenDocument).toHaveBeenCalledWith(firstId)
  })

  it('제목을 수정하고 생각을 삭제할 수 있다', async () => {
    const user = userEvent.setup()
    useMindMapStore.getState().startDocument('이번 회의 안건')
    render(<HomePage onStartNew={vi.fn()} onOpenDocument={vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: '제목 수정' })[0]!)
    const title = screen.getByLabelText('제목')
    await user.clear(title)
    await user.type(title, '바꾼 제목')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('button', { name: /바꾼 제목/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await user.click(screen.getByRole('heading', { name: '생각 삭제' }))
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' })
    await user.click(deleteButtons[deleteButtons.length - 1]!)
    expect(screen.getByText('아직 저장된 생각이 없습니다.')).toBeInTheDocument()
  })
})
