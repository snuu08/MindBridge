import { ElaborationResponseSchema } from '../schemas/elaborationSchema.ts'
import {
  AnalysisResponseSchema,
  type AnalysisResponse,
} from '../schemas/insightSchema.ts'
import { AI_ERROR_MESSAGE, type AnalysisPayload } from '../types/mindmap.ts'
import { getMockAnalysis, getMockElaboration } from './mockAi.ts'

function messageForCode(code: string, status: number): string {
  const hint =
    code === 'missing_api_key'
      ? 'API 키 또는 모델 이름이 .env에 없습니다.'
      : code === 'invalid_model'
        ? 'ANTHROPIC_MODEL 값이 올바른 모델 이름인지 확인하세요.'
        : code === 'auth_error'
          ? 'API 키가 거부되었습니다. 키를 다시 확인하세요.'
          : status === 404
            ? '로컬 AI 서버 함수에 연결하지 못했습니다. 개발 서버를 다시 켜보세요.'
            : ''
  return hint ? `${AI_ERROR_MESSAGE}\n${hint}` : AI_ERROR_MESSAGE
}

export class AiRequestError extends Error {
  constructor(message = AI_ERROR_MESSAGE) {
    super(message)
    this.name = 'AiRequestError'
  }
}

let mockAiOverride: boolean | null = null

export function setMockAiForTests(value: boolean | null): void {
  mockAiOverride = value
}

export function isMockAiEnabled(): boolean {
  if (mockAiOverride !== null) return mockAiOverride
  return import.meta.env.VITE_USE_MOCK_AI === 'true'
}

async function postJson<T>(
  url: string,
  body: unknown,
  parse: (data: unknown) => T,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    })
  } catch {
    throw new AiRequestError()
  }

  if (!response.ok) {
    let code = ''
    try {
      const payload = (await response.json()) as { error?: string }
      code = payload.error ?? ''
    } catch {
      code = ''
    }
    throw new AiRequestError(messageForCode(code, response.status))
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new AiRequestError()
  }

  return parse(data)
}

export async function analyzeThoughts(
  payload: AnalysisPayload,
): Promise<AnalysisResponse> {
  if (isMockAiEnabled()) {
    return getMockAnalysis(payload)
  }

  try {
    return await postJson(
      '/.netlify/functions/analyze-thoughts',
      payload,
      (data) => AnalysisResponseSchema.parse(data),
    )
  } catch {
    return getMockAnalysis(payload)
  }
}

export async function elaborateInsight(body: {
  title: string
  content: string
  basedOnLabels: string[]
}): Promise<ReturnType<typeof ElaborationResponseSchema.parse>> {
  if (isMockAiEnabled()) {
    return getMockElaboration(body)
  }

  try {
    return await postJson(
      '/.netlify/functions/elaborate-insight',
      body,
      (data) => ElaborationResponseSchema.parse(data),
    )
  } catch {
    return getMockElaboration(body)
  }
}
