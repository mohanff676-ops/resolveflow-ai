import { z } from 'zod';

export const runAgentSchema = z.object({
  message: z.string().trim().min(3, 'Message must be at least 3 characters long'),
  issue_id: z.string().trim().optional().nullable(),
  mode: z.enum(['pipeline', 'interactive']).optional().default('pipeline'),
});

export const approvalDecisionSchema = z.object({
  reason: z.string().trim().optional(),
});

export default {
  runAgentSchema,
  approvalDecisionSchema,
};
