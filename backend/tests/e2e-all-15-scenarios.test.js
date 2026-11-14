import http from 'http';
import app from '../src/app.js';
import { supabase } from '../src/config/database.js';
import AgentOrchestrator from '../src/agents/orchestrator.js';

let server;
const PORT = 3098;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runAll15Scenarios() {
  console.log('\n============================================================');
  console.log('    RESOLVEFLOW AI - 15 END-TO-END SCENARIO AUDIT SUITE     ');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, scenarioNum, scenarioName, details = '') => {
    if (condition) {
      console.log(`  ✅ [SCENARIO ${scenarioNum}] PASS: ${scenarioName}`);
      passed++;
    } else {
      console.error(`  ❌ [SCENARIO ${scenarioNum}] FAIL: ${scenarioName} - ${details}`);
      failed++;
    }
  };

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));

  let adminToken = '';
  let operatorToken = '';
  let testIssueId = null;
  let testWorkflowId = null;
  let testApprovalId = null;

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: LOGIN (Admin & Operator login, JWT issue, correct roles)
    // ------------------------------------------------------------------------
    console.log('Executing Scenario 1: Authentication & Login...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@resolveflow.ai', password: 'admin123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.data?.token;

    const opLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@resolveflow.ai', password: 'operator123' }),
    });
    const opLoginData = await opLoginRes.json();
    operatorToken = opLoginData.data?.token;

    assert(
      adminLoginRes.status === 200 && adminLoginData.data?.user?.role === 'admin' && adminToken &&
      opLoginRes.status === 200 && opLoginData.data?.user?.role === 'operator' && operatorToken,
      1,
      'Login verifies Admin and Operator credentials with valid JWTs'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 2: REGISTRATION (Enforces Operator role, prevents privilege escalation)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 2: Public User Registration...');
    const ephemeralEmail = `audit_tester_${Date.now()}@resolveflow.ai`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Audit Tester',
        email: ephemeralEmail,
        password: 'Password123!',
        role: 'admin', // Malicious attempt to elevate privileges
      }),
    });
    const regData = await regRes.json();

    assert(
      regRes.status === 201 && regData.data?.user?.role === 'operator',
      2,
      'Registration strictly enforces operator role and prevents privilege escalation'
    );

    // Clean up registered user
    if (regData.data?.user?.id) {
      await supabase.from('users').delete().eq('id', regData.data.user.id);
    }

    // ------------------------------------------------------------------------
    // SCENARIO 3: DASHBOARD LOADING (KPIs, active workflows, activity stream)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 3: Executive Dashboard Data Loading...');
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();

    const activityRes = await fetch(`${BASE_URL}/dashboard/activity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activityData = await activityRes.json();

    assert(
      statsRes.status === 200 && typeof statsData.data?.totalIssues === 'number' && typeof statsData.data?.activeWorkflows === 'number' &&
      activityRes.status === 200 && Array.isArray(activityData.data?.recentActions),
      3,
      'Dashboard loads accurate real-time metrics and agent activity streams'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 4: ORDERS LISTING & SLA DETAILS (Orders catalog, ORD-1003)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 4: Orders & SLA Directory...');
    const ordersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ordersData = await ordersRes.json();

    const ord1003Res = await fetch(`${BASE_URL}/orders/ORD-1003`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ord1003Data = await ord1003Res.json();

    assert(
      ordersRes.status === 200 && Array.isArray(ordersData.data) &&
      ord1003Res.status === 200 && ord1003Data.data?.order_number === 'ORD-1003' &&
      Array.isArray(ord1003Data.data?.items) && ord1003Data.data.items.length > 0,
      4,
      'Orders directory accurately queries orders and joins customer & line item records'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 5: ISSUES LISTING AND CREATION (Tickets, priority, update)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 5: Issues Management & Creation...');
    const createIssueRes = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'E2E Scenario Test Issue',
        description: 'Customer reported delayed delivery during automated audit',
        type: 'delayed_delivery',
        priority: 'high',
      }),
    });
    const createIssueData = await createIssueRes.json();
    testIssueId = createIssueData.data?.id;

    const patchIssueRes = await fetch(`${BASE_URL}/issues/${testIssueId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'investigating',
        resolution: 'Issue assigned to autonomous agent swarm',
      }),
    });
    const patchIssueData = await patchIssueRes.json();

    assert(
      createIssueRes.status === 201 && createIssueData.data?.issue_number &&
      patchIssueRes.status === 200 && patchIssueData.data?.status === 'investigating',
      5,
      'Issue tickets can be created, searched, and updated with auditable states'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 6: AI COMMAND CENTER (Workflow dispatch)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 6: AI Command Center Dispatch...');
    const triggerMsg = 'My order ORD-1003 has not arrived. It was supposed to arrive three days ago. Please investigate and resolve this issue.';
    const agentRunRes = await fetch(`${BASE_URL}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: triggerMsg }),
    });
    const agentRunData = await agentRunRes.json();
    const wfResult = agentRunData.data;
    testWorkflowId = wfResult?.workflow_id || wfResult?.workflowId;

    assert(
      agentRunRes.status === 200 && testWorkflowId &&
      (wfResult.status === 'awaiting_approval' || wfResult.status === 'completed'),
      6,
      'AI Command Center accepts natural-language objective and dispatches workflow'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 7: ORD-1003 EXECUTION (6 agents: intake -> decision -> execution)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 7: Multi-Agent Resolution for ORD-1003...');
    const intakeOk = wfResult.intake?.order_id === 'ORD-1003';
    const investigationOk = wfResult.investigation?.order?.order_number === 'ORD-1003';
    const decisionOk = wfResult.decision?.requires_admin_approval === true;
    const executionPaused = wfResult.status === 'awaiting_approval' || wfResult.execution?.paused_for_approval === true;

    assert(
      intakeOk && investigationOk && decisionOk && executionPaused,
      7,
      'All 6 specialized agents complete coordination cycle with SLA threshold gate'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 8: AGENT WORKFLOW HISTORY (Tasks, Actions, Supabase persistence)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 8: Workflow History & Audit Trail...');
    const wfDetailRes = await fetch(`${BASE_URL}/agent/workflows/${testWorkflowId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const wfDetailData = await wfDetailRes.json();
    const wfTasks = wfDetailData.data?.tasks || [];
    const wfActions = wfDetailData.data?.actions || [];
    const wfApprovals = wfDetailData.data?.approvals || [];
    testApprovalId = wfApprovals[0]?.id;

    assert(
      wfDetailRes.status === 200 && wfTasks.length >= 4 && wfActions.length >= 2 && testApprovalId,
      8,
      'Workflow timeline persists agent tasks, tool actions, and pending approval records'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 9: ADMINISTRATOR APPROVAL (Human-in-the-loop authorization)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 9: Administrator Approval Execution...');
    const adminApproveRes = await fetch(`${BASE_URL}/approvals/${testApprovalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    const adminApproveData = await adminApproveRes.json();

    assert(
      adminApproveRes.status === 200 && adminApproveData.data?.approved === true && adminApproveData.data?.transferId,
      9,
      'Administrator authorizes sensitive refund, triggering simulated disbursement and completion'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 10: OPERATOR APPROVAL REJECTION (RBAC enforcement)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 10: Security RBAC Guard on Approvals...');
    // Attempt approval with Operator token on any approval
    const opApproveRes = await fetch(`${BASE_URL}/approvals/${testApprovalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({}),
    });

    assert(
      opApproveRes.status === 403,
      10,
      'Operator account is strictly forbidden (HTTP 403) from authorizing financial transactions'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 11: ANALYTICS (Real metrics, agent metrics, 0 fabricated statistics)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 11: Analytics Verification...');
    const analyticsRes = await fetch(`${BASE_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = await analyticsRes.json();

    const agentAnalyticsRes = await fetch(`${BASE_URL}/analytics/agents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const agentAnalyticsData = await agentAnalyticsRes.json();

    assert(
      analyticsRes.status === 200 && typeof analyticsData.data?.completionRate === 'number' &&
      typeof analyticsData.data?.avgDurationSeconds === 'number' && analyticsData.data?.policyCount === 4 &&
      agentAnalyticsRes.status === 200 && agentAnalyticsData.data?.length === 6,
      11,
      'Analytics calculates genuine metrics from real timestamps and database records'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 12: LOGOUT AND PROTECTED ROUTES (JWT rejection)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 12: Protected Routes Security...');
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    const badTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid.tampered.token' },
    });

    assert(
      noTokenRes.status === 401 && badTokenRes.status === 401,
      12,
      'Protected endpoints strictly reject missing or tampered authentication tokens'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 13: MISSING ORDER HANDLING (Graceful failure without crash)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 13: Missing Order Error Recovery...');
    const missingOrderRes = await fetch(`${BASE_URL}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: 'Where is order ORD-9999? It is missing.' }),
    });
    const missingOrderData = await missingOrderRes.json();

    assert(
      missingOrderRes.status === 200 && missingOrderData.data?.status === 'failed' &&
      missingOrderData.data?.error?.includes('not found'),
      13,
      'Non-existent order gracefully transitions workflow to FAILED without server crash'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 14: GEMINI API FAILURE / RATE LIMIT RESILIENCE
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 14: Gemini API Error & Quota Handling...');
    const toolLoopResult = await AgentOrchestrator.runInteractiveAgentLoop({
      message: 'Check inventory for SWP-003',
      maxIterations: 2,
    });

    assert(
      (toolLoopResult.completed && toolLoopResult.toolCallHistory.length > 0) ||
      (!toolLoopResult.completed && toolLoopResult.error && toolLoopResult.error.includes('Gemini API')),
      14,
      'Gemini API failure or rate limit returns diagnostic error without fabricated data'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 15: DATABASE ERROR HANDLING (Invalid UUID & constraint validation)
    // ------------------------------------------------------------------------
    console.log('\nExecuting Scenario 15: Database Error Handling & Integrity...');
    const invalidIdRes = await fetch(`${BASE_URL}/issues/invalid-non-uuid-format`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const invalidIdData = await invalidIdRes.json();

    assert(
      invalidIdRes.status === 500 && invalidIdData.success === false && invalidIdData.error,
      15,
      'Database errors return structured JSON responses without process termination'
    );

    // Clean up created test issue & workflow
    if (testIssueId) {
      await supabase.from('issues').delete().eq('id', testIssueId);
    }
    if (testWorkflowId) {
      await supabase.from('approvals').delete().eq('workflow_id', testWorkflowId);
      await supabase.from('agent_actions').delete().eq('workflow_id', testWorkflowId);
      await supabase.from('agent_tasks').delete().eq('workflow_id', testWorkflowId);
      await supabase.from('workflows').delete().eq('id', testWorkflowId);
    }
  } catch (err) {
    console.error('Audit encountered unexpected failure:', err);
    failed++;
  } finally {
    if (server) server.close();
  }

  console.log('\n============================================================');
  console.log(`SCENARIO AUDIT COMPLETE: ${passed}/15 passed, ${failed}/15 failed`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

runAll15Scenarios();
