import type { Session, User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.ts'

const RECOVERY_KEY = 'mindbridge:password-recovery'

export function displayNameFromUser(user: User | null | undefined) {
  const name = user?.user_metadata?.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return user?.email ?? ''
}

function hasRecoveryFlag() {
  try {
    return sessionStorage.getItem(RECOVERY_KEY) === '1'
  } catch {
    return false
  }
}

export function markPasswordRecovery() {
  try {
    sessionStorage.setItem(RECOVERY_KEY, '1')
  } catch {
    // ignore
  }
}

export function clearPasswordRecovery() {
  try {
    sessionStorage.removeItem(RECOVERY_KEY)
  } catch {
    // ignore
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [recovery, setRecovery] = useState(hasRecoveryFlag)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        markPasswordRecovery()
        setRecovery(true)
      }
      if (event === 'SIGNED_OUT') {
        clearPasswordRecovery()
        setRecovery(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    user: session?.user ?? null,
    recovery,
    loading,
    finishRecovery: () => {
      clearPasswordRecovery()
      setRecovery(false)
    },
  }
}
