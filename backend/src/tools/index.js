import { z } from 'zod';
import { supabase } from '../config/database.js';
import { ISSUE_TYPES, ISSUE_PRIORITIES, ISSUE_STATUSES, APPROVAL_ACTION_TYPES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// TOOL ARGUMENT SCHEMAS (ZOD)
// ============================================================================

export const toolSchemas = {
  getOrderDetails: z.object({
    orderId: z.string().trim().min(1, 'orderId is required (UUID or ORD-XXXX)'),
  }),
  getCustomerDetails: z.object({
    customerId: z.string().trim().min(1, 'customerId is required (UUID or email)'),
  }),
  getPaymentStatus: z.object({
    orderId: z.string().trim().min(1, 'orderId is required'),
  }),
  getDeliveryStatus: z.object({
    orderId: z.string().trim().min(1, 'orderId is required'),
  }),
  getPreviousComplaints: z.object({
    customerId: z.string().trim().min(1, 'customerId is required'),
  }),
  getInventoryDetails: z.object({
    productId: z.string().trim().min(1, 'productId is required (UUID or SKU)'),
  }),
  createSupportIssue: z.object({
    order_id: z.string().trim().optional().nullable(),
    customer_id: z.string().trim().min(1, 'customer_id is required'),
    type: z.enum(ISSUE_TYPES),
    priority: z.enum(ISSUE_PRIORITIES).optional().default('medium'),
    title: z.string().trim().min(3, 'title must be at least 3 characters'),
    description: z.string().trim().min(5, 'description must be at least 5 characters'),
  }),
  createDeliveryEscalation: z.object({
    order_id: z.string().trim().min(1, 'order_id is required'),
    reason: z.string().trim().min(5, 'reason is required'),
    priority: z.enum(ISSUE_PRIORITIES).optional().default('high'),
    carrier_notes: z.string().trim().optional(),
  }),
  createRefundRequest: z.object({
    order_id: z.string().trim().min(1, 'order_id is required'),
    amount: z.number().positive('amount must be positive'),
    reason: z.string().trim().min(5, 'reason is required'),
    workflow_id: z.string().trim().optional(),
  }),
  updateIssueStatus: z.object({
    issueId: z.string().trim().min(1, 'issueId is required (UUID or ISS-XXXX)'),
    status: z.enum(ISSUE_STATUSES),
    resolution: z.string().trim().optional(),
  }),
  requestAdminApproval: z.object({
    workflow_id: z.string().trim().min(1, 'workflow_id is required'),
    action_type: z.enum(APPROVAL_ACTION_TYPES),
    details: z.record(z.any()),
    reason: z.string().trim().min(5, 'reason is required'),
  }),
  recordAgentAction: z.object({
    workflow_id: z.string().trim().min(1, 'workflow_id is required'),
    task_id: z.string().trim().optional().nullable(),
    tool_name: z.string().trim().min(1, 'tool_name is required'),
    arguments: z.record(z.any()).optional().default({}),
    result: z.record(z.any()).optional().nullable(),
    status: z.enum(['pending', 'running', 'success', 'failed']).optional().default('success'),
    error: z.string().optional().nullable(),
  }),
};

// ============================================================================
// HELPER TO RESOLVE ORDER BY UUID OR ORDER NUMBER
// ============================================================================
async function findOrder(orderIdOrNumber) {
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderIdOrNumber);
  let query = supabase.from('orders').select('*');
  if (isUUID) {
    query = query.eq('id', orderIdOrNumber);
  } else {
    query = query.eq('order_number', orderIdOrNumber.toUpperCase());
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Database error looking up order: ${error.message}`);
  return data;
}

// ============================================================================
// 12 BACKEND TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * 1. getOrderDetails(orderId)
 */
export async function getOrderDetails({ orderId }) {
  const order = await findOrder(orderId);
  if (!order) {
    return { found: false, message: `Order not found with identifier: ${orderId}` };
  }

  // Get customer info
  let customer = null;
  if (order.customer_id) {
    const { data: custData } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('id', order.customer_id)
      .maybeSingle();
    customer = custData;
  }

  // Get items
  const { data: items } = await supabase
    .from('order_items')
    .select('id, quantity, unit_price, product_id')
    .eq('order_id', order.id);

  const productIds = items?.map((i) => i.product_id).filter(Boolean) || [];
  let productsMap = {};
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, category, stock_quantity')
      .in('id', productIds);
    productsMap = (products || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }

  const detailedItems = (items || []).map((item) => ({
    ...item,
    product: productsMap[item.product_id] || { name: 'Unknown Product', sku: 'N/A' },
  }));

  return {
    found: true,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      order_date: order.order_date,
      expected_delivery: order.expected_delivery,
      actual_delivery: order.actual_delivery,
      shipping_address: order.shipping_address,
      notes: order.notes,
      customer,
      items: detailedItems,
    },
  };
}

/**
 * 2. getCustomerDetails(customerId)
 */
export async function getCustomerDetails({ customerId }) {
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(customerId);
  let query = supabase.from('customers').select('*');
  if (isUUID) {
    query = query.eq('id', customerId);
  } else {
    query = query.eq('email', customerId.toLowerCase().trim());
  }
  const { data: customer, error } = await query.maybeSingle();
  if (error) throw new Error(`Database error fetching customer: ${error.message}`);
  if (!customer) {
    return { found: false, message: `Customer not found: ${customerId}` };
  }
  return { found: true, customer };
}

/**
 * 3. getPaymentStatus(orderId)
 */
export async function getPaymentStatus({ orderId }) {
  const order = await findOrder(orderId);
  if (!order) {
    return { found: false, message: `Order not found: ${orderId}` };
  }

  // In this business system, confirmed/shipped/delivered/delayed orders are paid
  const isPaid = ['confirmed', 'processing', 'shipped', 'delivered', 'delayed'].includes(order.status);
  const isCancelled = order.status === 'cancelled';

  return {
    found: true,
    order_id: order.id,
    order_number: order.order_number,
    payment_status: isCancelled ? 'REFUNDABLE' : isPaid ? 'COMPLETED' : 'PENDING',
    payment_method: 'Credit Card (Stripe SIM)',
    amount_paid: Number(order.total_amount),
    currency: 'USD',
    paid_at: order.order_date,
    transaction_id: `TXN-SIM-${order.order_number}-${order.id.slice(0, 8)}`,
  };
}

/**
 * 4. getDeliveryStatus(orderId)
 */
export async function getDeliveryStatus({ orderId }) {
  const order = await findOrder(orderId);
  if (!order) {
    return { found: false, message: `Order not found: ${orderId}` };
  }

  const now = new Date();
  let delayDays = 0;
  let isDelayed = false;

  if (order.expected_delivery) {
    const expected = new Date(order.expected_delivery);
    if (!order.actual_delivery && now > expected) {
      delayDays = Math.max(1, Math.floor((now.getTime() - expected.getTime()) / (24 * 60 * 60 * 1000)));
      isDelayed = true;
    }
  }

  if (order.status === 'delayed') {
    isDelayed = true;
    if (delayDays === 0) delayDays = 3; // Baseline demo delay
  }

  return {
    found: true,
    order_id: order.id,
    order_number: order.order_number,
    delivery_status: order.status,
    carrier: 'FedEx Express (Simulated)',
    tracking_number: `FX-SIM-${order.order_number}`,
    order_date: order.order_date,
    expected_delivery: order.expected_delivery,
    actual_delivery: order.actual_delivery,
    is_delayed: isDelayed,
    delay_days: delayDays,
    last_known_location: isDelayed ? 'Central Transit Sorting Hub (Stalled)' : 'In Transit',
    notes: order.notes || (isDelayed ? 'Shipment past expected delivery SLA' : 'On schedule'),
  };
}

/**
 * 5. getPreviousComplaints(customerId)
 */
export async function getPreviousComplaints({ customerId }) {
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(customerId);
  let resolvedCustId = customerId;
  if (!isUUID) {
    const { data: cust } = await supabase.from('customers').select('id').eq('email', customerId).maybeSingle();
    if (!cust) return { count: 0, complaints: [] };
    resolvedCustId = cust.id;
  }

  const { data: issues, error } = await supabase
    .from('issues')
    .select('id, issue_number, title, type, priority, status, resolution, created_at')
    .eq('customer_id', resolvedCustId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Database error fetching complaints: ${error.message}`);

  return {
    count: issues?.length || 0,
    complaints: issues || [],
  };
}

/**
 * 6. getInventoryDetails(productId)
 */
export async function getInventoryDetails({ productId }) {
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(productId);
  let query = supabase.from('products').select('*');
  if (isUUID) {
    query = query.eq('id', productId);
  } else {
    query = query.eq('sku', productId.toUpperCase().trim());
  }
  const { data: product, error } = await query.maybeSingle();
  if (error) throw new Error(`Database error fetching product: ${error.message}`);
  if (!product) {
    return { found: false, message: `Product not found: ${productId}` };
  }
  return {
    found: true,
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock_quantity: product.stock_quantity,
      in_stock: product.stock_quantity > 0,
      category: product.category,
      description: product.description,
    },
  };
}

/**
 * 7. createSupportIssue(data)
 */
export async function createSupportIssue(input) {
  // Generate next issue number
  const { count } = await supabase.from('issues').select('*', { count: 'exact', head: true });
  const nextNum = 1000 + (count || 0) + 1;
  const issueNumber = `ISS-${nextNum}`;

  // Resolve order_id if order_number was provided
  let resolvedOrderId = input.order_id;
  if (resolvedOrderId && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(resolvedOrderId)) {
    const o = await findOrder(resolvedOrderId);
    if (o) resolvedOrderId = o.id;
  }

  const { data: issue, error } = await supabase
    .from('issues')
    .insert([
      {
        issue_number: issueNumber,
        order_id: resolvedOrderId || null,
        customer_id: input.customer_id,
        type: input.type,
        priority: input.priority || 'medium',
        status: 'open',
        title: input.title,
        description: input.description,
      },
    ])
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create issue: ${error.message}`);

  // Audit log
  await supabase.from('audit_logs').insert([
    {
      action: 'issue_created_by_agent',
      entity_type: 'issues',
      entity_id: issue.id,
      metadata: { issue_number: issue.issue_number, type: issue.type, priority: issue.priority },
    },
  ]);

  return { success: true, issue };
}

/**
 * 8. createDeliveryEscalation(data)
 */
export async function createDeliveryEscalation(input) {
  const order = await findOrder(input.order_id);
  if (!order) {
    return { success: false, error: `Order not found: ${input.order_id}` };
  }

  const escalationId = `ESC-${Date.now().toString().slice(-6)}`;
  const updatedNotes = `${order.notes || ''}\n[ESCALATION ${escalationId} - ${new Date().toISOString()}]: Priority: ${input.priority}. Reason: ${input.reason}. Notes: ${input.carrier_notes || 'Carrier SLA breach'}`.trim();

  // Update order notes
  await supabase
    .from('orders')
    .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  // If there is an associated issue, mark as escalated
  await supabase
    .from('issues')
    .update({ status: 'escalated', updated_at: new Date().toISOString() })
    .eq('order_id', order.id);

  // Audit log
  await supabase.from('audit_logs').insert([
    {
      action: 'carrier_escalation_created',
      entity_type: 'orders',
      entity_id: order.id,
      metadata: { escalation_id: escalationId, reason: input.reason, priority: input.priority },
    },
  ]);

  return {
    success: true,
    escalation_id: escalationId,
    order_id: order.id,
    order_number: order.order_number,
    status: 'ESCALATED_TO_CARRIER',
    carrier_sla: 'High Priority Investigation (24h response SLA)',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 9. createRefundRequest(data)
 */
export async function createRefundRequest(input) {
  const order = await findOrder(input.order_id);
  if (!order) {
    return { success: false, error: `Order not found: ${input.order_id}` };
  }

  // Fetch business policy
  const { data: policyRecord } = await supabase
    .from('business_policies')
    .select('policy_value')
    .eq('policy_key', 'refund_policy')
    .maybeSingle();

  const policy = policyRecord?.policy_value || { requires_approval_above: 50 };
  const requiresApproval = input.amount > (policy.requires_approval_above || 50);

  // If a workflowId is provided and approval is required, register approval request
  let approvalId = null;
  if (requiresApproval && input.workflow_id) {
    const { data: existingApp } = await supabase
      .from('approvals')
      .select('id, status')
      .eq('workflow_id', input.workflow_id)
      .eq('action_type', 'refund')
      .maybeSingle();

    if (existingApp) {
      approvalId = existingApp.id;
    } else {
      const { data: newApp, error: appErr } = await supabase
        .from('approvals')
        .insert([
          {
            workflow_id: input.workflow_id,
            action_type: 'refund',
            details: {
              order_id: order.id,
              order_number: order.order_number,
              amount: input.amount,
              reason: input.reason,
            },
            status: 'pending',
          },
        ])
        .select('id')
        .single();
      if (!appErr && newApp) approvalId = newApp.id;
    }

    // Update workflow status to awaiting_approval
    await supabase
      .from('workflows')
      .update({ status: 'awaiting_approval' })
      .eq('id', input.workflow_id);
  }

  return {
    success: true,
    order_id: order.id,
    order_number: order.order_number,
    amount: input.amount,
    reason: input.reason,
    requires_approval: requiresApproval,
    approval_status: requiresApproval ? 'PENDING_ADMIN_APPROVAL' : 'AUTO_APPROVED',
    approval_id: approvalId,
    notice: requiresApproval
      ? 'Refund exceeds $50.00 policy threshold. Routed to Human Administrator for approval.'
      : 'Refund eligible for automatic execution.',
  };
}

/**
 * 10. updateIssueStatus(issueId, status, resolution)
 */
export async function updateIssueStatus({ issueId, status, resolution }) {
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(issueId);
  let query = supabase.from('issues').update({
    status,
    ...(resolution ? { resolution } : {}),
    updated_at: new Date().toISOString(),
  });

  if (isUUID) {
    query = query.eq('id', issueId);
  } else {
    query = query.eq('issue_number', issueId.toUpperCase().trim());
  }

  const { data: updated, error } = await query.select('*').maybeSingle();
  if (error) throw new Error(`Failed to update issue status: ${error.message}`);
  if (!updated) {
    return { success: false, error: `Issue not found: ${issueId}` };
  }

  return { success: true, issue: updated };
}

/**
 * 11. requestAdminApproval(data)
 */
export async function requestAdminApproval(input) {
  // Check for duplicate pending approval
  const { data: existing } = await supabase
    .from('approvals')
    .select('*')
    .eq('workflow_id', input.workflow_id)
    .eq('action_type', input.action_type)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      already_pending: true,
      approval_id: existing.id,
      status: 'pending',
      message: 'An approval request for this action is already pending review.',
    };
  }

  const { data: newApproval, error } = await supabase
    .from('approvals')
    .insert([
      {
        workflow_id: input.workflow_id,
        action_type: input.action_type,
        details: input.details,
        reason: input.reason,
        status: 'pending',
      },
    ])
    .select('*')
    .single();

  if (error) throw new Error(`Failed to request approval: ${error.message}`);

  // Mark workflow awaiting_approval
  await supabase
    .from('workflows')
    .update({ status: 'awaiting_approval' })
    .eq('id', input.workflow_id);

  return {
    success: true,
    approval_id: newApproval.id,
    status: 'pending',
    action_type: input.action_type,
    message: 'Operation halted pending administrator approval.',
  };
}

/**
 * 12. recordAgentAction(data)
 */
export async function recordAgentAction(input) {
  let taskId = input.task_id;

  // Ensure valid task_id to satisfy NOT NULL foreign key constraint
  if (!taskId && input.workflow_id) {
    const { data: existingTask } = await supabase
      .from('agent_tasks')
      .select('id')
      .eq('workflow_id', input.workflow_id)
      .limit(1)
      .maybeSingle();

    if (existingTask) {
      taskId = existingTask.id;
    } else {
      const { data: newTask } = await supabase
        .from('agent_tasks')
        .insert([
          {
            workflow_id: input.workflow_id,
            agent_role: 'execution',
            status: 'running',
            started_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();
      taskId = newTask?.id;
    }
  }

  const { data: action, error } = await supabase
    .from('agent_actions')
    .insert([
      {
        workflow_id: input.workflow_id,
        task_id: taskId,
        tool_name: input.tool_name,
        arguments: input.arguments || {},
        result: input.result || null,
        status: input.status || 'success',
        error: input.error || null,
      },
    ])
    .select('*')
    .single();

  if (error) {
    logger.error(`Error recording agent action: ${error.message}`);
    return { success: false, error: error.message };
  }

  return { success: true, action };
}

// ============================================================================
// TOOL REGISTRY MAP & GEMINI FUNCTION DECLARATIONS
// ============================================================================

export const toolRegistry = {
  getOrderDetails,
  getCustomerDetails,
  getPaymentStatus,
  getDeliveryStatus,
  getPreviousComplaints,
  getInventoryDetails,
  createSupportIssue,
  createDeliveryEscalation,
  createRefundRequest,
  updateIssueStatus,
  requestAdminApproval,
  recordAgentAction,
};

export const geminiFunctionDeclarations = [
  {
    name: 'getOrderDetails',
    description: 'Retrieve complete order details including status, totals, delivery dates, items and customer by order ID or order number (e.g. ORD-1003).',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The order UUID or order number (e.g., ORD-1003)' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'getCustomerDetails',
    description: 'Retrieve customer contact information and address by customer ID or email.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer UUID or email address' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'getPaymentStatus',
    description: 'Verify payment status, transaction ID, and amount paid for an order.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The order UUID or order number' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'getDeliveryStatus',
    description: 'Retrieve shipment tracking details, current carrier location, delivery SLA and delay calculation.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The order UUID or order number' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'getPreviousComplaints',
    description: 'Check previous customer support issues and complaint history for a customer.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Customer UUID or email' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'getInventoryDetails',
    description: 'Check product stock level, unit price, and category by product ID or SKU.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product UUID or SKU (e.g. SWP-003)' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'createSupportIssue',
    description: 'Create a formal support ticket/issue record in the database.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Customer UUID' },
        order_id: { type: 'string', description: 'Associated order UUID or order number' },
        type: { type: 'string', enum: ISSUE_TYPES, description: 'Problem classification' },
        priority: { type: 'string', enum: ISSUE_PRIORITIES, description: 'Issue priority' },
        title: { type: 'string', description: 'Short summary of the issue' },
        description: { type: 'string', description: 'Detailed problem description' },
      },
      required: ['customer_id', 'type', 'title', 'description'],
    },
  },
  {
    name: 'createDeliveryEscalation',
    description: 'Create an urgent carrier delivery escalation with tracking hub investigation.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'The order UUID or order number' },
        reason: { type: 'string', description: 'Reason for carrier escalation' },
        priority: { type: 'string', enum: ISSUE_PRIORITIES, description: 'Escalation priority' },
        carrier_notes: { type: 'string', description: 'Optional operational notes for carrier' },
      },
      required: ['order_id', 'reason'],
    },
  },
  {
    name: 'createRefundRequest',
    description: 'Initiate a refund evaluation or request. If amount exceeds business policy threshold ($50), automatically routes to Admin approval.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'The order UUID or order number' },
        amount: { type: 'number', description: 'Refund amount in USD' },
        reason: { type: 'string', description: 'Justification for refund' },
        workflow_id: { type: 'string', description: 'Current active workflow UUID' },
      },
      required: ['order_id', 'amount', 'reason'],
    },
  },
  {
    name: 'updateIssueStatus',
    description: 'Update the resolution status of an issue (e.g. investigating, in_progress, resolved).',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string', description: 'Issue UUID or issue number (e.g. ISS-1001)' },
        status: { type: 'string', enum: ISSUE_STATUSES, description: 'New issue status' },
        resolution: { type: 'string', description: 'Resolution summary text' },
      },
      required: ['issueId', 'status'],
    },
  },
  {
    name: 'requestAdminApproval',
    description: 'Halt workflow and request Human Administrator sign-off for sensitive operations like financial refunds.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Active workflow UUID' },
        action_type: { type: 'string', enum: APPROVAL_ACTION_TYPES, description: 'Type of sensitive action' },
        details: { type: 'object', description: 'Action payload details (e.g. order_id, amount)' },
        reason: { type: 'string', description: 'Explanation for administrator' },
      },
      required: ['workflow_id', 'action_type', 'details', 'reason'],
    },
  },
  {
    name: 'recordAgentAction',
    description: 'Record an agent action or execution step in the persistent audit trail.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Active workflow UUID' },
        task_id: { type: 'string', description: 'Parent agent task UUID' },
        tool_name: { type: 'string', description: 'Name of the tool executed' },
        arguments: { type: 'object', description: 'Arguments passed to the tool' },
        result: { type: 'object', description: 'Result returned by the tool' },
        status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] },
        error: { type: 'string', description: 'Error message if failed' },
      },
      required: ['workflow_id', 'tool_name'],
    },
  },
];

/**
 * Execute a backend tool safely with validation
 */
export async function executeTool(toolName, rawArgs) {
  const handler = toolRegistry[toolName];
  if (!handler) {
    logger.warn(`Rejected call to unregistered tool: "${toolName}"`);
    return {
      success: false,
      error: `Tool "${toolName}" is not registered or permitted in ResolveFlow AI engine.`,
    };
  }

  const schema = toolSchemas[toolName];
  let validatedArgs = rawArgs;
  if (schema) {
    try {
      validatedArgs = schema.parse(rawArgs || {});
    } catch (valErr) {
      const issues = valErr.issues || valErr.errors;
      const msg = issues && Array.isArray(issues) ? issues.map((e) => e.message).join(', ') : valErr.message;
      logger.error(`Validation error for tool "${toolName}": ${msg}`);
      return {
        success: false,
        error: `Invalid arguments for ${toolName}: ${msg}`,
      };
    }
  }

  try {
    const result = await handler(validatedArgs);
    return {
      success: true,
      data: result,
    };
  } catch (err) {
    logger.error(`Execution error in tool "${toolName}":`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

export default {
  toolSchemas,
  toolRegistry,
  geminiFunctionDeclarations,
  executeTool,
};
