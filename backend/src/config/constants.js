export const USER_ROLES = ['operator', 'admin'];

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'delayed',
];

export const ISSUE_TYPES = [
  'delayed_delivery',
  'missing_item',
  'wrong_item',
  'damaged_item',
  'refund_request',
  'general_inquiry',
  'payment_issue',
];

export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical'];

export const ISSUE_STATUSES = [
  'open',
  'investigating',
  'in_progress',
  'awaiting_approval',
  'resolved',
  'closed',
  'escalated',
];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'executed'];

export const AGENT_ROLES = [
  'intake',
  'investigation',
  'decision',
  'execution',
  'verification',
  'monitoring',
];

export const WORKFLOW_STATUSES = [
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
];

export const APPROVAL_ACTION_TYPES = [
  'refund',
  'cancellation',
  'financial_adjustment',
  'escalation',
];

export default {
  USER_ROLES,
  ORDER_STATUSES,
  ISSUE_TYPES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  APPROVAL_STATUSES,
  AGENT_ROLES,
  WORKFLOW_STATUSES,
  APPROVAL_ACTION_TYPES,
};
