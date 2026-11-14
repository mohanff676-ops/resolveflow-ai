import { supabase } from '../config/database.js';
import { generateTicketId } from '../utils/ticketId.js';
import AgentOrchestrator from '../agents/orchestrator.js';
import { logger } from '../utils/logger.js';

/**
 * Helper to map user-selected category to database issue type
 */
function mapCategoryToType(category, description = '') {
  const desc = description.toLowerCase();
  switch (category) {
    case 'E-commerce':
      if (desc.includes('refund') || desc.includes('money back')) return 'refund_request';
      return 'delayed_delivery';
    case 'Customer Support':
      if (desc.includes('damage') || desc.includes('broken')) return 'damaged_item';
      return 'general_inquiry';
    case 'Warehouse and Inventory':
      if (desc.includes('miss') || desc.includes('lost')) return 'missing_item';
      return 'wrong_item';
    case 'Business Operations':
      return 'payment_issue';
    default:
      return 'general_inquiry';
  }
}

/**
 * 1. Create a Support Ticket and initiate agent workflow
 */
export async function createTicket({
  customer_name,
  customer_email,
  order_id,
  category = 'E-commerce',
  description,
  userId = null,
}) {
  const normalizedEmail = customer_email.toLowerCase().trim();
  const trimmedName = customer_name.trim();

  // 1. Find or create customer record
  let customerId = null;
  const { data: existingCustomer, error: custErr } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (custErr) {
    logger.warn(`Database lookup warning for customer: ${custErr.message}`);
  }

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    // Insert new customer record
    const { data: newCust, error: newCustErr } = await supabase
      .from('customers')
      .insert([
        {
          name: trimmedName,
          email: normalizedEmail,
        },
      ])
      .select('id')
      .single();

    if (newCustErr) {
      throw new Error(`Failed to create customer profile: ${newCustErr.message}`);
    }
    customerId = newCust.id;
  }

  // 2. Resolve optional Order ID (UUID or ORD-XXXX)
  let resolvedOrderId = null;
  let resolvedOrderNumber = null;
  if (order_id && order_id.trim()) {
    const rawOrder = order_id.trim();
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawOrder);
    let orderQuery = supabase.from('orders').select('id, order_number');
    if (isUuid) {
      orderQuery = orderQuery.eq('id', rawOrder);
    } else {
      orderQuery = orderQuery.eq('order_number', rawOrder.toUpperCase());
    }
    const { data: ord } = await orderQuery.maybeSingle();
    if (ord) {
      resolvedOrderId = ord.id;
      resolvedOrderNumber = ord.order_number;
    } else {
      resolvedOrderNumber = rawOrder.toUpperCase();
    }
  }

  // 3. Generate unique ticket identifier (e.g. RF-2026-A7K92)
  let ticketId = generateTicketId();
  let collisionCheck = true;
  let attempts = 0;
  while (collisionCheck && attempts < 5) {
    const { data: collision } = await supabase
      .from('issues')
      .select('id')
      .eq('issue_number', ticketId)
      .maybeSingle();
    if (!collision) {
      collisionCheck = false;
    } else {
      ticketId = generateTicketId();
      attempts++;
    }
  }

  const mappedType = mapCategoryToType(category, description);
  const titleSummary = `[${category}] ${description.slice(0, 50).trim()}${description.length > 50 ? '...' : ''}`;

  // 4. Persist ticket in Supabase issues table with collision-safe retry
  let newIssue = null;
  let insertAttempts = 0;
  while (!newIssue && insertAttempts < 5) {
    const { data: insertedIssue, error: issueErr } = await supabase
      .from('issues')
      .insert([
        {
          issue_number: ticketId,
          title: titleSummary,
          description: description.trim(),
          order_id: resolvedOrderId,
          customer_id: customerId,
          type: mappedType,
          priority: 'medium',
          status: 'investigating',
        },
      ])
      .select('id, issue_number, title, description, status, created_at')
      .single();

    if (!issueErr && insertedIssue) {
      newIssue = insertedIssue;
    } else if (issueErr?.code === '23505') {
      logger.warn(`[TicketService] Collision detected on issue_number constraint for ${ticketId}. Regenerating...`);
      ticketId = generateTicketId();
      insertAttempts++;
    } else {
      throw new Error(`Failed to persist support ticket in database: ${issueErr?.message}`);
    }
  }

  if (!newIssue) {
    throw new Error('Failed to generate a collision-free ticket ID after maximum attempts.');
  }

  logger.info(`[TicketService] Ticket created successfully: ${ticketId} (ID: ${newIssue.id})`);

  // 5. Construct full trigger message and dispatch to 6-agent engine
  const orderRef = resolvedOrderNumber ? `, Order ID: ${resolvedOrderNumber}` : '';
  const agentTrigger = `[Ticket ${ticketId}] [Category: ${category}] ${description.trim()} (Customer: ${trimmedName} <${normalizedEmail}>${orderRef})`;

  // Start workflow asynchronously so client receives immediate ticket ID confirmation
  AgentOrchestrator.runWorkflow({
    message: agentTrigger,
    userId: userId || null,
    issueId: newIssue.id,
  }).catch((wfErr) => {
    logger.error(`[TicketService] Error during agent workflow execution for ticket ${ticketId}:`, wfErr.message);
  });

  return {
    ticket_id: ticketId,
    customer_name: trimmedName,
    customer_email: normalizedEmail,
    category,
    order_id: resolvedOrderNumber,
    description: description.trim(),
    status: 'investigating',
    created_at: newIssue.created_at,
  };
}

/**
 * 2. Get customer-safe Ticket Details with ownership verification
 */
export async function getTicketByPublicId(ticketId, customerEmail) {
  if (!ticketId || !ticketId.trim()) {
    const err = new Error('Ticket ID is required');
    err.statusCode = 400;
    throw err;
  }
  if (!customerEmail || !customerEmail.trim()) {
    const err = new Error('Customer email is required for ownership verification');
    err.statusCode = 400;
    throw err;
  }

  const cleanId = ticketId.trim().toUpperCase();
  const cleanEmail = customerEmail.trim().toLowerCase();

  const { data: issue, error: issueErr } = await supabase
    .from('issues')
    .select('*, customer:customers(id, name, email), order:orders(id, order_number)')
    .eq('issue_number', cleanId)
    .maybeSingle();

  if (issueErr || !issue) {
    const err = new Error(`No ticket found with ID ${cleanId}. Please check the identifier.`);
    err.statusCode = 404;
    throw err;
  }

  // Ownership verification check
  const ticketEmail = issue.customer?.email?.toLowerCase().trim();
  if (ticketEmail !== cleanEmail) {
    const err = new Error('Customer email does not match the records for this ticket.');
    err.statusCode = 403;
    throw err;
  }

  // Retrieve linked workflow and approvals if any
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, status, execution_plan, started_at, completed_at')
    .eq('issue_id', issue.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let requiresApproval = false;
  if (workflow) {
    const { data: pendingAppr } = await supabase
      .from('approvals')
      .select('id, status')
      .eq('workflow_id', workflow.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingAppr || workflow.status === 'awaiting_approval' || issue.status === 'awaiting_approval') {
      requiresApproval = true;
    }
  }

  // Extract category from title if present
  let category = 'Customer Support';
  const categoryMatch = issue.title?.match(/^\[(.*?)\]/);
  if (categoryMatch && categoryMatch[1]) {
    category = categoryMatch[1];
  }

  // Determine customer-friendly latest update
  let latestUpdate = 'Your ticket has been logged and is under active investigation.';
  if (requiresApproval) {
    latestUpdate = 'Your request requires administrator approval.';
  } else if (issue.status === 'resolved') {
    latestUpdate = issue.resolution || 'Your issue has been successfully resolved.';
  } else if (issue.status === 'closed') {
    latestUpdate = issue.resolution || 'Ticket closed.';
  } else if (issue.status === 'in_progress') {
    latestUpdate = 'Our automated agents are checking order and fulfillment records.';
  }

  // Return strictly customer-safe payload
  return {
    ticket_id: issue.issue_number,
    customer_name: issue.customer?.name || 'Customer',
    customer_email: issue.customer?.email || cleanEmail,
    category,
    order_number: issue.order?.order_number || null,
    description: issue.description,
    status: requiresApproval ? 'awaiting_approval' : issue.status,
    requires_approval: requiresApproval,
    latest_update: latestUpdate,
    resolution: issue.status === 'resolved' ? (issue.resolution || 'Resolved') : null,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

/**
 * 3. Get customer-safe 7-Step Progress Timeline
 */
export async function getTicketProgress(ticketId, customerEmail) {
  // First verify ticket ownership
  const ticket = await getTicketByPublicId(ticketId, customerEmail);

  // Fetch issue record
  const { data: issue } = await supabase
    .from('issues')
    .select('id, status, created_at, updated_at, resolution')
    .eq('issue_number', ticket.ticket_id)
    .single();

  // Fetch workflow tasks
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, status, started_at, completed_at')
    .eq('issue_id', issue.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let tasks = [];
  let pendingApproval = null;
  let executedApproval = null;

  if (workflow) {
    const [tasksRes, apprRes] = await Promise.all([
      supabase.from('agent_tasks').select('agent_role, status, started_at, completed_at').eq('workflow_id', workflow.id),
      supabase.from('approvals').select('id, status, decided_at').eq('workflow_id', workflow.id),
    ]);

    tasks = tasksRes.data || [];
    const approvals = apprRes.data || [];
    pendingApproval = approvals.find((a) => a.status === 'pending');
    executedApproval = approvals.find((a) => a.status === 'executed');
  }

  const taskMap = {};
  for (const t of tasks) {
    taskMap[t.agent_role] = t;
  }

  const isIntakeDone = taskMap.intake?.status === 'completed';
  const isInvestigationDone = taskMap.investigation?.status === 'completed';
  const isDecisionDone = taskMap.decision?.status === 'completed';
  const isExecutionDone = taskMap.execution?.status === 'completed';
  const isVerificationDone = taskMap.verification?.status === 'completed';
  const isMonitoringDone = taskMap.monitoring?.status === 'completed';
  const isMonitoringRunning = taskMap.monitoring?.status === 'running';

  const isAwaitingApproval = !!pendingApproval || workflow?.status === 'awaiting_approval' || issue.status === 'awaiting_approval';
  const isResolvedOrClosed = issue.status === 'resolved' || issue.status === 'closed' || (workflow?.status === 'completed' && !isAwaitingApproval);

  // Construct the 7 customer-friendly steps
  const steps = [
    {
      step: 1,
      name: 'Ticket Received',
      status: 'completed',
      description: 'Your support ticket was received and logged in the system.',
      updated_at: issue.created_at,
    },
    {
      step: 2,
      name: 'Checking Customer Information',
      status: isIntakeDone ? 'completed' : taskMap.intake ? 'current' : 'pending',
      description: isIntakeDone
        ? 'Customer identity and request categorized.'
        : taskMap.intake
        ? 'Reading your complaint and categorizing the issue.'
        : 'Waiting to examine customer profile.',
      updated_at: taskMap.intake?.completed_at || taskMap.intake?.started_at || null,
    },
    {
      step: 3,
      name: 'Investigating the Problem',
      status: isInvestigationDone
        ? 'completed'
        : taskMap.investigation
        ? 'current'
        : isIntakeDone
        ? 'current'
        : 'pending',
      description: isInvestigationDone
        ? 'Order records, carrier tracking, and fulfillment timelines checked.'
        : taskMap.investigation || isIntakeDone
        ? 'Investigating carrier tracking and fulfillment data.'
        : 'Awaiting order verification.',
      updated_at: taskMap.investigation?.completed_at || taskMap.investigation?.started_at || null,
    },
    {
      step: 4,
      name: 'Finding the Best Solution',
      status: isDecisionDone
        ? 'completed'
        : taskMap.decision
        ? 'current'
        : isInvestigationDone
        ? 'current'
        : 'pending',
      description: isDecisionDone
        ? 'Service level agreements and business policies evaluated.'
        : 'Evaluating business rules to select the fairest resolution.',
      updated_at: taskMap.decision?.completed_at || taskMap.decision?.started_at || null,
    },
    {
      step: 5,
      name: 'Taking Action',
      status: isExecutionDone
        ? 'completed'
        : taskMap.execution
        ? 'current'
        : isDecisionDone
        ? 'current'
        : 'pending',
      description: isExecutionDone
        ? 'Carrier notifications dispatched and operational records updated.'
        : 'Executing required support updates and carrier escalations.',
      updated_at: taskMap.execution?.completed_at || taskMap.execution?.started_at || null,
    },
    {
      step: 6,
      name: 'Waiting for Administrator Approval, when needed',
      status: isAwaitingApproval
        ? 'current'
        : executedApproval
        ? 'completed'
        : isExecutionDone
        ? 'completed'
        : 'pending',
      description: isAwaitingApproval
        ? 'Your request requires administrator approval.'
        : executedApproval
        ? 'Administrator reviewed and authorized the resolution.'
        : isExecutionDone
        ? 'Automated resolution authorized within policy limits.'
        : 'Reviewing whether manager authorization is required.',
      updated_at: pendingApproval ? issue.updated_at : executedApproval?.decided_at || null,
    },
    {
      step: 7,
      name: 'Resolved or Closed',
      status: isResolvedOrClosed
        ? 'completed'
        : isMonitoringRunning
        ? 'current'
        : isVerificationDone && !isAwaitingApproval
        ? 'current'
        : 'pending',
      description: isResolvedOrClosed
        ? (issue.resolution || 'Resolution finalized and verified in customer records.')
        : isMonitoringRunning
        ? 'Monitoring Agent is finalizing audit logs and resolution records.'
        : isVerificationDone && !isAwaitingApproval
        ? 'Monitoring Agent compiling resolution summary.'
        : 'Final verification and ticket resolution pending.',
      updated_at: taskMap.monitoring?.completed_at || (isResolvedOrClosed ? issue.updated_at : taskMap.monitoring?.started_at || null),
    },
  ];

  return {
    ticket_id: ticket.ticket_id,
    current_status: isAwaitingApproval ? 'awaiting_approval' : issue.status,
    requires_approval: isAwaitingApproval,
    approval_message: isAwaitingApproval ? 'Your request requires administrator approval.' : null,
    latest_update: ticket.latest_update,
    updated_at: issue.updated_at,
    monitoring: taskMap.monitoring
      ? {
          status: taskMap.monitoring.status,
          started_at: taskMap.monitoring.started_at,
          completed_at: taskMap.monitoring.completed_at,
        }
      : null,
    steps,
  };
}

export default {
  createTicket,
  getTicketByPublicId,
  getTicketProgress,
};
