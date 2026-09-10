import Anthropic from '@anthropic-ai/sdk'
import { ELABORATE_INSIGHT_PROMPT } from '../../../src/prompts/elaborateInsightPrompt.ts'
import { MIND_BRIDGE_SYSTEM_PROMPT } from '../../../src/prompts/mindBridgeSystemPrompt.ts'
import { ElaborationResponseSchema } from '../../../src/schemas/elaborationSchema.ts'
import { AnalysisResponseSchema } from '../../../src/schemas/insightSchema.ts'

function env(name: string): string | undefined {
  const runtime = globalThis as {
    Netlify?: { env: { get: (key: string) => string | undefined } }
  }
  return runtime.Netlify?.env.get(name) || process.env[name]
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

function parseModelJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  const raw = fenced?.[1] ?? text
  return JSON.parse(raw)
}

export function getClaudeConfig(): { apiKey: string; model: string } | null {
  const apiKey = env('ANTHROPIC_API_KEY')
  const model = env('ANTHROPIC_MODEL')
  if (!apiKey || !model) return null
  return { apiKey, model }
}

function repairAnalysis(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const data = raw as Record<string, unknown>
  const insights = Array.isArray(data.insights) ? data.insights.slice(0, 3) : []
  return {
    analysisSummary: String(data.analysisSummary ?? '').slice(0, 300),
    insights: insights.map((item, index) => {
      const row = item as Record<string, unknown>
      const type = String(row.type)
      return {
        id: String(row.id ?? `insight-${index + 1}`),
        type: ['agenda', 'perspective', 'question', 'action'].includes(type)
          ? type
          : 'agenda',
        title: String(row.title ?? '').slice(0, 80),
        content: String(row.content ?? '').slice(0, 400),
        rationale: String(row.rationale ?? '').slice(0, 300),
        basedOnNodeIds:
          Array.isArray(row.basedOnNodeIds) && row.basedOnNodeIds.length > 0
            ? row.basedOnNodeIds.map(String)
            : ['unknown'],
        gap: String(row.gap ?? '아직 작성되지 않은 부분').slice(0, 200),
        questions: Array.isArray(row.questions)
          ? row.questions.map(String).slice(0, 3)
          : [],
        actions: Array.isArray(row.actions) ? row.actions.map(String).slice(0, 3) : [],
      }
    }),
    clarification: data.clarification ?? null,
  }
}

async function askJson(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<unknown> {
  const client = new Anthropic({ apiKey, timeout: 20000 })
  const message = await client.messages.create({
    model,
    max_tokens: 1200,
    system,
    messages: [{ role: 'user', content: user }],
  })
  return parseModelJson(extractText(message.content))
}

export async function runAnalyze(body: unknown): Promise<
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: string }
> {
  const config = getClaudeConfig()
  if (!config) return { ok: false, status: 503, error: 'missing_api_key' }

  try {
    const parsed = repairAnalysis(
      await askJson(
        config.apiKey,
        config.model,
        MIND_BRIDGE_SYSTEM_PROMPT,
        JSON.stringify(body),
      ),
    )
    const result = AnalysisResponseSchema.safeParse(parsed)
    if (!result.success) return { ok: false, status: 502, error: 'invalid_model_response' }
    return { ok: true, data: result.data }
  } catch (error) {
    return { ok: false, status: 502, error: classifyUpstream(error) }
  }
}

export async function runElaborate(body: unknown): Promise<
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: string }
> {
  const config = getClaudeConfig()
  if (!config) return { ok: false, status: 503, error: 'missing_api_key' }

  try {
    const parsed = await askJson(
      config.apiKey,
      config.model,
      ELABORATE_INSIGHT_PROMPT,
      JSON.stringify(body),
    )
    const result = ElaborationResponseSchema.safeParse(parsed)
    if (!result.success) return { ok: false, status: 502, error: 'invalid_model_response' }
    return { ok: true, data: result.data }
  } catch (error) {
    return { ok: false, status: 502, error: classifyUpstream(error) }
  }
}

function classifyUpstream(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  console.error('[MindBridge Claude]', message)
  if (/not_found|model/i.test(message)) return 'invalid_model'
  if (/401|403|auth|api.?key|invalid x-api-key/i.test(message)) return 'auth_error'
  return 'upstream_error'
}
