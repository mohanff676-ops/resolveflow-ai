import server from '../src/server.js';
import AgentOrchestrator from '../src/agents/orchestrator.js';
import { supabase } from '../src/config/database.js';

const BASE_URL = 'http://localhost:3001/api';

async function runOrchestrationTests() {
  console.log('\n============================================================');
  console.log('       RESOLVEFLOW AI - ORCHESTRATION & AGENT ENGINE TESTS  ');
  console.log('============================================================\n');

  // Allow server to bind
  await new Promise((r) => setTimeout(r, 600));

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, extra = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  };

  let adminToken = null;
  let operatorToken = null;
  let demoWorkflowId = null;
  let demoApprovalId = null;

  try {
    // 0. Authenticate Admin and Operator for API calls
    console.log('0. Authenticating test actors...');
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@resolveflow.ai', password: 'admin123' }),
    });
    const adminData = await adminLogin.json();
    adminToken = adminData.data.token;

    const opLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@resolveflow.ai', password: 'operator123' }),
    });
    const opData = await opLogin.json();
    operatorToken = opData.data.token;

    assert(adminToken && operatorToken, 'Admin and Operator tokens acquired');

    // 1. PRIMARY DEMONSTRATION WORKFLOW (ORD-1003)
    console.log('\n1. Testing Primary Hackathon Demo Workflow (ORD-1003)...');
    const demoPrompt =
      'My order ORD-1003 has not arrived. It was supposed to arrive three days ago. Please investigate and resolve this issue.';

    const runRes = await fetch(`${BASE_URL}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ message: demoPrompt }),
    });

    const runData = await runRes.json();
    assert(runRes.status === 200 && runData.success, 'POST /api/agent/run completes workflow invocation', JSON.stringify(runData));

    const wf = runData.data;
    demoWorkflowId = wf.workflow_id;

    assert(wf.intake.order_id === 'ORD-1003', 'Intake Agent correctly extracts ORD-1003');
    assert(wf.intake.issue_type === 'delayed_delivery', 'Intake Agent classifies as delayed_delivery');
    assert(wf.investigation.verified === true, 'Investigation Agent verifies order in database');
    assert(wf.investigation.order.order_number === 'ORD-1003', 'Investigation Agent retrieves actual order records');
    assert(wf.investigation.delivery.is_delayed === true, 'Investigation Agent confirms 3-day SLA delay');
    assert(wf.decision.requires_admin_approval === true, 'Decision Agent flags refund > $50 as requiring admin approval');
    assert(wf.status === 'awaiting_approval', 'Workflow transitions to AWAITING_APPROVAL state');
    assert(wf.verification.all_checks_passed === true, 'Verification Agent confirms database persistence');

    // 2. Verify Database Persistence of Workflow, Tasks, Actions & Approvals
    console.log('\n2. Verifying Persistent Database Records in Supabase...');
    const wfDetailsRes = await fetch(`${BASE_URL}/agent/workflows/${demoWorkflowId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const wfDetails = await wfDetailsRes.json();
    assert(wfDetails.success && wfDetails.data.tasks.length >= 4, 'Workflow has persisted agent tasks (intake, investigation, decision, execution)');
    assert(wfDetails.data.actions.length >= 2, 'Workflow has persisted agent tool actions');
    assert(wfDetails.data.approvals.length >= 1, 'Workflow has persisted pending approval in approvals table');
    demoApprovalId = wfDetails.data.approvals[0]?.id;

    // 3. Security: Operator attempting to approve sensitive action
    console.log('\n3. Testing Security RBAC: Operator attempting Admin Approval...');
    const opApproveRes = await fetch(`${BASE_URL}/approvals/${demoApprovalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({}),
    });
    assert(opApproveRes.status === 403, 'Operator forbidden (403) from approving sensitive action');

    // 4. Human-in-the-Loop: Admin Approves Sensitive Operation
    console.log('\n4. Testing Human-in-the-Loop: Admin Approves Sensitive Action...');
    const adminApproveRes = await fetch(`${BASE_URL}/approvals/${demoApprovalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    const adminApproveData = await adminApproveRes.json();
    assert(
      adminApproveRes.status === 200 &&
        adminApproveData.data.status === 'executed' &&
        adminApproveData.data.execution_result.simulated === true,
      'Admin approves operation: simulated refund executed & audited'
    );

    // 5. Anti-Duplicate Protection: Attempting repeated approval
    console.log('\n5. Testing Anti-Duplicate Protection: Repeated Approval Rejection...');
    const dupApproveRes = await fetch(`${BASE_URL}/approvals/${demoApprovalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    assert(dupApproveRes.status === 409, 'Duplicate approval attempt rejected with 409 Conflict');

    // 6. Test Workflow Final State in Supabase
    console.log('\n6. Verifying Final Workflow State after Approval...');
    const finalWfRes = await fetch(`${BASE_URL}/agent/workflows/${demoWorkflowId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const finalWfData = await finalWfRes.json();
    assert(finalWfData.data.status === 'completed', 'Workflow status successfully transitioned to COMPLETED');

    // 7. Security: Public Registration Privilege Escalation Prevention
    console.log('\n7. Testing Security: Public Registration cannot grant "admin" role...');
    const hackUserEmail = `hack.admin.${Date.now()}@resolveflow.ai`;
    const hackRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: hackUserEmail,
        password: 'Password123!',
        name: 'Attacker Attempting Admin',
        role: 'admin', // Attempting privilege escalation
      }),
    });
    const hackRegData = await hackRegRes.json();
    assert(
      hackRegRes.status === 201 && hackRegData.data.user.role === 'operator',
      'Public registration strictly forces role to "operator" regardless of payload'
    );
    // Cleanup hack test user
    await supabase.from('users').delete().eq('email', hackUserEmail);

    // 8. Error Recovery: Missing / Non-existent Order Handling
    console.log('\n8. Testing Error Handling & Recovery: Missing Order (ORD-9999)...');
    const missingOrderRes = await fetch(`${BASE_URL}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ message: 'Order ORD-9999 is missing, where is it?' }),
    });
    const missingOrderData = await missingOrderRes.json();
    assert(
      missingOrderRes.status === 200 &&
        missingOrderData.data.status === 'failed' &&
        missingOrderData.data.error.includes('not found'),
      'Workflow gracefully halts with status FAILED when order is missing'
    );

    // 9. Interactive Gemini Tool-Calling Loop Test
    console.log('\n9. Testing Interactive Gemini Function-Calling Loop...');
    const loopRes = await AgentOrchestrator.runInteractiveAgentLoop({
      message: 'Can you look up product details for SKU SWP-003 and tell me its stock level?',
      maxIterations: 4,
    });
    if (loopRes.completed) {
      assert(
        loopRes.toolCallHistory.length > 0 && loopRes.toolCallHistory.some((h) => h.tool === 'getInventoryDetails'),
        'Gemini autonomous function-calling loop invokes getInventoryDetails and returns answer'
      );
    } else {
      assert(
        !loopRes.completed && loopRes.error && loopRes.error.includes('Gemini API'),
        'Gemini API failure properly diagnosed without fabricated results or unhandled crashes'
      );
    }

  } catch (err) {
    console.error('Orchestration suite unexpected failure:', err);
    failed++;
  } finally {
    // Clean up created demo workflow to keep database in clean state
    if (demoWorkflowId) {
      console.log('\nCleaning up demonstration workflow records from Supabase...');
      await supabase.from('approvals').delete().eq('workflow_id', demoWorkflowId);
      await supabase.from('agent_actions').delete().eq('workflow_id', demoWorkflowId);
      await supabase.from('agent_tasks').delete().eq('workflow_id', demoWorkflowId);
      await supabase.from('workflows').delete().eq('id', demoWorkflowId);
      console.log('Demonstration test records cleaned.\n');
    }

    console.log('============================================================');
    console.log(`ORCHESTRATION TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('============================================================\n');

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

runOrchestrationTests();
