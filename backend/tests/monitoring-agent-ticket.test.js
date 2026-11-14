import { supabase } from '../src/config/database.js';
import * as ticketService from '../src/services/ticket.service.js';
import { MonitoringAgent } from '../src/agents/roles/monitoring.agent.js';
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

async function runMonitoringAgentTest() {
  console.log('\n============================================================');
  console.log('   RESOLVEFLOW AI — MONITORING AGENT PROGRESS TEST         ');
  console.log('============================================================\n');

  const testEmail = `monitoring.test.${Date.now()}@example.com`;
  
  // 1. Create a test ticket
  const ticket = await ticketService.createTicket({
    customer_name: 'Monitoring Test User',
    customer_email: testEmail,
    category: 'Customer Support',
    description: 'Verifying Monitoring Agent task persistence in Supabase and customer timeline.',
  });

  assert(ticket && ticket.ticket_id, `Ticket created with ID: ${ticket.ticket_id}`);

  // Fetch created issue record
  const { data: issue } = await supabase
    .from('issues')
    .select('id, issue_number, status')
    .eq('issue_number', ticket.ticket_id)
    .single();

  assert(issue && issue.id, `Issue record found in Supabase (id: ${issue.id})`);

  // Wait briefly for workflow creation
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, issue_id, status')
    .eq('issue_id', issue.id)
    .single();

  assert(workflow && workflow.id, `Linked workflow found in Supabase (workflow_id: ${workflow.id})`);

  // 2. Test Monitoring Agent running state persistence
  const monitor = new MonitoringAgent(workflow.id);
  const startTask = await monitor.startTask('monitoring', {
    stage: 'final_review',
    workflow_id: workflow.id,
    ticket_id: ticket.ticket_id,
  });

  assert(startTask && startTask.agent_role === 'monitoring', `Monitoring Agent task started with role 'monitoring'`);

  // Query Supabase agent_tasks table to verify persistence of running state
  const { data: runningTaskInDb } = await supabase
    .from('agent_tasks')
    .select('id, agent_role, status, started_at')
    .eq('workflow_id', workflow.id)
    .eq('agent_role', 'monitoring')
    .single();

  assert(
    runningTaskInDb && runningTaskInDb.status === 'running',
    `Monitoring Agent 'running' status persisted in Supabase agent_tasks (task_id: ${runningTaskInDb?.id})`
  );

  // Verify reflection in customer timeline while running
  const progressWhileRunning = await ticketService.getTicketProgress(ticket.ticket_id, testEmail);
  assert(
    progressWhileRunning.monitoring && progressWhileRunning.monitoring.status === 'running',
    `Customer progress payload reflects monitoring agent running state`
  );
  assert(
    progressWhileRunning.steps[6].status === 'current',
    `Step 7 'Resolved or Closed' reflects 'current' status while Monitoring Agent is active`
  );
  assert(
    progressWhileRunning.steps[6].description.includes('Monitoring Agent'),
    `Step 7 description highlights Monitoring Agent active review`
  );

  // 3. Complete Monitoring Agent task checkpoint in Supabase
  const completionPayload = {
    resolution: 'Customer complaint verified and resolved under standard policy.',
    status: 'completed',
    audited: true,
  };
  await monitor.completeTask('monitoring', completionPayload, true);

  // Query Supabase agent_tasks table to verify completion persistence
  const { data: completedTaskInDb } = await supabase
    .from('agent_tasks')
    .select('id, agent_role, status, completed_at, output')
    .eq('workflow_id', workflow.id)
    .eq('agent_role', 'monitoring')
    .single();

  assert(
    completedTaskInDb && completedTaskInDb.status === 'completed',
    `Monitoring Agent 'completed' status persisted in Supabase agent_tasks table`
  );
  assert(
    !!completedTaskInDb.completed_at,
    `Monitoring Agent completed_at timestamp recorded: ${completedTaskInDb.completed_at}`
  );

  // Update issue to resolved to simulate final workflow wrap-up
  await supabase
    .from('issues')
    .update({
      status: 'resolved',
      resolution: completionPayload.resolution,
      updated_at: completedTaskInDb.completed_at,
    })
    .eq('id', issue.id);

  // 4. Verify customer tracking timeline reflects completed Monitoring Agent progress
  const progressCompleted = await ticketService.getTicketProgress(ticket.ticket_id, testEmail);
  assert(
    progressCompleted.monitoring && progressCompleted.monitoring.status === 'completed',
    `Customer progress payload returns monitoring object with status === 'completed'`
  );
  assert(
    progressCompleted.steps[6].status === 'completed',
    `Step 7 'Resolved or Closed' transitions to 'completed'`
  );
  assert(
    progressCompleted.steps[6].updated_at === completedTaskInDb.completed_at,
    `Step 7 updated_at timestamp matches Monitoring Agent completed_at: ${progressCompleted.steps[6].updated_at}`
  );

  // 5. Test Monitoring Agent integration during admin approval handling
  const { data: approval } = await supabase
    .from('approvals')
    .insert([{
      workflow_id: workflow.id,
      action_type: 'refund',
      details: {
        order_number: 'ORD-1003',
        amount: 85.00,
        reason: 'Monitoring Agent approval test',
      },
      status: 'pending',
    }])
    .select('id')
    .single();

  const approvalResult = await AgentOrchestrator.handleAdminApproval({
    approvalId: approval.id,
    approved: true,
    adminUserId: null,
  });

  assert(approvalResult.approved === true, `Admin approval executed`);

  // Verify that handleAdminApproval updated/recorded Monitoring Agent checkpoint
  const { data: approvalMonitorTask } = await supabase
    .from('agent_tasks')
    .select('id, agent_role, status, output')
    .eq('workflow_id', workflow.id)
    .eq('agent_role', 'monitoring')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  assert(
    approvalMonitorTask && approvalMonitorTask.status === 'completed',
    `Monitoring Agent checkpoint recorded for admin approval in Supabase`
  );

  // Clean up test records
  await supabase.from('approvals').delete().eq('workflow_id', workflow.id);
  await supabase.from('agent_actions').delete().eq('workflow_id', workflow.id);
  await supabase.from('agent_tasks').delete().eq('workflow_id', workflow.id);
  await supabase.from('workflows').delete().eq('id', workflow.id);
  await supabase.from('issues').delete().eq('id', issue.id);

  console.log('\n============================================================');
  console.log(`MONITORING AGENT TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMonitoringAgentTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
