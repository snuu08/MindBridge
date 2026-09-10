import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'
import { runAnalyze, runElaborate } from './netlify/functions/_shared/runClaude.ts'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function localAiPlugin(): Plugin {
  return {
    name: 'mindbridge-local-ai',
    configureServer(server) {
      const loaded = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '')
      if (loaded.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = loaded.ANTHROPIC_API_KEY
      if (loaded.ANTHROPIC_MODEL) process.env.ANTHROPIC_MODEL = loaded.ANTHROPIC_MODEL

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (req.method !== 'POST') {
          next()
          return
        }
        if (
          url !== '/.netlify/functions/analyze-thoughts' &&
          url !== '/.netlify/functions/elaborate-insight'
        ) {
          next()
          return
        }

        try {
          const raw = await readBody(req)
          const body: unknown = raw ? JSON.parse(raw) : {}
          const result =
            url === '/.netlify/functions/analyze-thoughts'
              ? await runAnalyze(body)
              : await runElaborate(body)
          if (!result.ok) {
            send(res, result.status, { error: result.error })
            return
          }
          send(res, 200, result.data)
        } catch {
          send(res, 502, { error: 'upstream_error' })
        }
      })
    },
  }
}
