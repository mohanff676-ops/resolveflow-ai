import { z } from 'zod';

export const createIssueSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  type: z.enum([
    'delayed_delivery',
    'missing_item',
    'wrong_item',
    'damaged_item',
    'refund_request',
    'general_inquiry',
    'payment_issue',
  ]).default('general_inquiry'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  order_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
});

export const updateIssueSchema = z.object({
  status: z.enum([
    'open',
    'investigating',
    'in_progress',
    'awaiting_approval',
    'resolved',
    'closed',
    'escalated',
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  resolution: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
});
