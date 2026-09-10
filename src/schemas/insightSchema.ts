import { z } from 'zod'

export const InsightTypeSchema = z.enum([
  'agenda',
  'perspective',
  'question',
  'action',
])

export const InsightSchema = z.object({
  id: z.string(),
  type: InsightTypeSchema,
  title: z.string().min(2).max(80),
  content: z.string().min(5).max(400),
  rationale: z.string().min(5).max(300),
  basedOnNodeIds: z.array(z.string()).min(1),
  gap: z.string().min(3).max(200),
  questions: z.array(z.string()).max(3),
  actions: z.array(z.string()).max(3),
})

export const AnalysisResponseSchema = z.object({
  analysisSummary: z.string().max(300),
  insights: z.array(InsightSchema).max(3),
  clarification: z
    .object({
      question: z.string(),
      options: z.array(z.string()).min(2).max(3),
    })
    .nullable(),
})

export type Insight = z.infer<typeof InsightSchema>
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>
