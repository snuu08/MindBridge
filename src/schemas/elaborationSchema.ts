import { z } from 'zod'

export const ElaborationResponseSchema = z.object({
  purpose: z.string().min(5).max(400),
  checks: z.array(z.string().min(2)).min(1).max(5),
  methods: z.array(z.string().min(2)).min(1).max(4),
  materials: z.array(z.string().min(2)).min(1).max(5),
  decisions: z.array(z.string().min(2)).min(1).max(6),
})

export type ElaborationResponse = z.infer<typeof ElaborationResponseSchema>
