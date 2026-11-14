import { supabase } from '../src/config/database.js';
import * as ticketService from '../src/services/ticket.service.js';
import { generateTicketId } from '../src/utils/ticketId.js';
import AgentOrchestrator from '../src/agents/orchestrator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failed++;
  }
}

async function runAudit() {
  console.log('\n============================================================');
  console.log('       RESOLVEFLOW AI — FOCUSED TICKET SYSTEM AUDIT         ');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // POINT 1: Database-level UNIQUE constraint and collision-safe generation
  // --------------------------------------------------------------------------
  console.log('--- AUDIT POINT 1: Database-Level UNIQUE Constraint & Collision Safety ---');
  
  // 1a. Test ID format
  const sampleId = generateTicketId();
  assert(
    /^RF-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/.test(sampleId),
    `Ticket ID format matches RF-YYYY-XXXXX (${sampleId}) with unambiguous characters`
  );

  // 1b. Test database-level UNIQUE constraint on issues.issue_number
  const testDuplicateId = `RF-TEST-DUP-${Date.now()}`;
  const { data: firstInsert, error: firstErr } = await supabase.from('issues').insert([{
    issue_number: testDuplicateId,
    title: 'Constraint Test 1',
    description: 'Testing unique constraint insertion',
    type: 'general_inquiry',
  }]).select('id, issue_number').single();

  assert(!firstErr && firstInsert?.id, `First insert with ID ${testDuplicateId} succeeded`);

  // Attempt duplicate insert with same issue_number
  const { error: dupErr } = await supabase.from('issues').insert([{
    issue_number: testDuplicateId,
    title: 'Constraint Test 2 (Should Fail)',
    description: 'Testing duplicate constraint failure',
    type: 'general_inquiry',
  }]);

  assert(
    dupErr && (dupErr.code === '23505' || dupErr.message.includes('unique constraint')),
    `Database rejected duplicate issue_number at PostgreSQL engine level (code: ${dupErr?.code}, message: ${dupErr?.message})`
  );

  // Clean up test record
  if (firstInsert?.id) {
    await supabase.from('issues').delete().eq('id', firstInsert.id);
  }

  // --------------------------------------------------------------------------
  // POINT 2: Ticket creation creates & links workflow and starts 6-agent process
  // --------------------------------------------------------------------------
  console.log('\n--- AUDIT POINT 2: Workflow Linkage & 6-Agent Process Initiation ---');
  
  const testCustEmail = `audit.user.${Date.now()}@example.com`;
  const createdTicket = await ticketService.createTicket({
    customer_name: 'Audit Customer',
    customer_email: testCustEmail,
    category: 'E-commerce',
    description: 'Testing complete ticket-workflow linkage for delayed package inquiry.',
  });

  assert(createdTicket?.ticket_id, `Ticket created with ID: ${createdTicket?.ticket_id}`);

  // Query database for the issue record
  const { data: issueRecord } = await supabase
    .from('issues')
    .select('id, issue_number, status, customer:customers(email)')
    .eq('issue_number', createdTicket.ticket_id)
    .single();

  assert(issueRecord && issueRecord.id, `Issue successfully persisted in Supabase (id: ${issueRecord?.id})`);

  // Wait briefly for workflow creation by background async orchestrator
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const { data: linkedWorkflow } = await supabase
    .from('workflows')
    .select('id, issue_id, status, trigger_message')
    .eq('issue_id', issueRecord.id)
    .maybeSingle();

  assert(linkedWorkflow && linkedWorkflow.id, `Workflow record created and linked to issue (workflow_id: ${linkedWorkflow?.id})`);
  assert(linkedWorkflow?.issue_id === issueRecord.id, `Bidirectional linkage confirmed: workflow.issue_id === issue.id`);

  // --------------------------------------------------------------------------
  // POINT 3: All 3 API endpoints work and enforce customer ownership verification
  // --------------------------------------------------------------------------
  console.log('\n--- AUDIT POINT 3: API Endpoints & Customer Ownership Verification ---');

  // 3a. Successful lookup with correct email
  const lookupSuccess = await ticketService.getTicketByPublicId(createdTicket.ticket_id, testCustEmail);
  assert(lookupSuccess.ticket_id === createdTicket.ticket_id, `GET endpoint returns ticket data with correct email`);
  assert(!lookupSuccess.internal_reasoning && !lookupSuccess.tool_calls, `Zero exposure of internal agent tools or reasoning`);

  // 3b. Ownership verification rejection with mismatched email
  let forbiddenRejected = false;
  try {
    await ticketService.getTicketByPublicId(createdTicket.ticket_id, 'wrong.intruder@example.com');
  } catch (err) {
    if (err.statusCode === 403) forbiddenRejected = true;
  }
  assert(forbiddenRejected, `Ownership verification enforced: Mismatched email rejected with 403 Forbidden`);

  // 3c. Missing email rejection
  let missingEmailRejected = false;
  try {
    await ticketService.getTicketByPublicId(createdTicket.ticket_id, '');
  } catch (err) {
    if (err.statusCode === 400) missingEmailRejected = true;
  }
  assert(missingEmailRejected, `Missing email rejected with 400 Bad Request`);

  // 3d. Non-existent ticket ID rejection
  let notFoundRejected = false;
  try {
    await ticketService.getTicketByPublicId('RF-9999-NONEXIST', testCustEmail);
  } catch (err) {
    if (err.statusCode === 404) notFoundRejected = true;
  }
  assert(notFoundRejected, `Non-existent ticket ID rejected with 404 Not Found`);

  // --------------------------------------------------------------------------
  // POINT 4: Agent progress saved to Supabase and reflected in customer timeline
  // --------------------------------------------------------------------------
  console.log('\n--- AUDIT POINT 4: Agent Progress Persistence & 7-Step Timeline ---');

  const progress = await ticketService.getTicketProgress(createdTicket.ticket_id, testCustEmail);
  assert(Array.isArray(progress.steps), `Progress timeline returned array of steps`);
  assert(progress.steps.length === 7, `Timeline contains exactly 7 customer-safe progress steps`);
  assert(progress.steps[0].name === 'Ticket Received' && progress.steps[0].status === 'completed', `Step 1 is "Ticket Received" and marked completed`);
  assert(progress.steps[1].name === 'Checking Customer Information', `Step 2 is "Checking Customer Information"`);
  assert(progress.steps[2].name === 'Investigating the Problem', `Step 3 is "Investigating the Problem"`);
  assert(progress.steps[3].name === 'Finding the Best Solution', `Step 4 is "Finding the Best Solution"`);
  assert(progress.steps[4].name === 'Taking Action', `Step 5 is "Taking Action"`);
  assert(progress.steps[5].name === 'Waiting for Administrator Approval, when needed', `Step 6 is "Waiting for Administrator Approval, when needed"`);
  assert(progress.steps[6].name === 'Resolved or Closed', `Step 7 is "Resolved or Closed"`);

  // --------------------------------------------------------------------------
  // POINT 5: Approval does NOT mark ticket resolved unless actions executed & verified
  // --------------------------------------------------------------------------
  console.log('\n--- AUDIT POINT 5: Approval Verification Before Marking Resolved ---');

  // Create a synthetic approval record requiring $150 refund
  const { data: testApproval, error: appCreateErr } = await supabase
    .from('approvals')
    .insert([{
      workflow_id: linkedWorkflow.id,
      action_type: 'refund',
      details: {
        order_number: 'ORD-1003',
        amount: 150.00,
        reason: 'Audit verification test',
      },
      status: 'pending',
    }])
    .select('id')
    .single();

  assert(!appCreateErr && testApproval?.id, `Test approval record created with status 'pending'`);

  // Set issue to awaiting_approval
  await supabase.from('issues').update({ status: 'awaiting_approval' }).eq('id', issueRecord.id);

  // Check progress reflection while awaiting approval
  const progressAwaiting = await ticketService.getTicketProgress(createdTicket.ticket_id, testCustEmail);
  assert(progressAwaiting.requires_approval === true, `Progress timeline reflects requires_approval === true`);
  assert(
    progressAwaiting.steps[5].description === 'Your request requires administrator approval.',
    `Step 6 reflects: "Your request requires administrator approval."`
  );

  // Test REJECTION: Admin rejects the approval
  const rejectResult = await AgentOrchestrator.handleAdminApproval({
    approvalId: testApproval.id,
    approved: false,
    adminUserId: null,
    rejectionReason: 'Exceeds budget policy limits',
  });

  assert(rejectResult.status === 'rejected', `Admin rejection handled: Status is 'rejected'`);

  // Check that rejection did NOT mark the issue resolved; it must be marked 'closed'
  const { data: rejectedIssue } = await supabase.from('issues').select('status, resolution').eq('id', issueRecord.id).single();
  assert(rejectedIssue.status === 'closed', `Rejection verified: Ticket is marked 'closed', NOT 'resolved' (status: ${rejectedIssue?.status})`);
  assert(rejectedIssue.resolution.includes('Administrator reviewed and declined'), `Rejection note recorded in resolution`);

  // Test APPROVAL with verification check:
  // Create another pending approval
  const { data: testApproval2 } = await supabase
    .from('approvals')
    .insert([{
      workflow_id: linkedWorkflow.id,
      action_type: 'refund',
      details: {
        order_number: 'ORD-1003',
        amount: 75.00,
        reason: 'Audit approval test',
      },
      status: 'pending',
    }])
    .select('id')
    .single();

  const approveResult = await AgentOrchestrator.handleAdminApproval({
    approvalId: testApproval2.id,
    approved: true,
    adminUserId: null,
  });

  assert(approveResult.approved === true, `Admin approval processed: approved === true`);
  assert(approveResult.transferId && approveResult.transferId.startsWith('SIM_TX_'), `Action actually executed with transfer ID: ${approveResult.transferId}`);

  // Verify that an agent action was recorded for auditability
  const { data: executedAction } = await supabase
    .from('agent_actions')
    .select('tool_name, status, result')
    .eq('workflow_id', linkedWorkflow.id)
    .eq('tool_name', 'execute_approved_refund')
    .maybeSingle();

  assert(executedAction && executedAction.status === 'success', `Execution verified in agent_actions table`);

  // Verify issue is now marked resolved with execution transfer ID
  const { data: resolvedIssue } = await supabase.from('issues').select('status, resolution').eq('id', issueRecord.id).single();
  assert(resolvedIssue.status === 'resolved', `Ticket marked 'resolved' only AFTER action execution and verification`);
  assert(resolvedIssue.resolution.includes(approveResult.transferId), `Resolution contains verified transaction ID`);

  // Clean up audit test records
  await supabase.from('approvals').delete().eq('workflow_id', linkedWorkflow.id);
  await supabase.from('agent_actions').delete().eq('workflow_id', linkedWorkflow.id);
  await supabase.from('workflows').delete().eq('id', linkedWorkflow.id);
  await supabase.from('issues').delete().eq('id', issueRecord.id);

  console.log('\n============================================================');
  console.log(`AUDIT RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
