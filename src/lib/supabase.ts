import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

export function isSupabaseConfigured() {
  return Boolean(url && publishableKey)
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  publishableKey || 'sb_publishable_placeholder',
)
