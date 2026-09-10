import type { Config } from '@netlify/functions'
import { runAnalyze } from './_shared/runClaude.ts'

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const result = await runAnalyze(body)
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status })
  }
  return Response.json(result.data)
}

export const config: Config = {
  path: '/.netlify/functions/analyze-thoughts',
}
