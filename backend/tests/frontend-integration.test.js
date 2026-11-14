import http from 'http';
import app from '../src/app.js';
import { supabase } from '../src/config/database.js';

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runFrontendIntegrationTests() {
  console.log('\n============================================================');
  console.log('       RESOLVEFLOW AI - FRONTEND ENDPOINTS INTEGRATION TEST  ');
  console.log('============================================================\n');

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

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));

  try {
    // 1. Obtain Admin Token
    console.log('1. Authenticating Admin User...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@resolveflow.ai', password: 'admin123' }),
    });
    const loginData = await loginRes.json();

    assert(loginRes.status === 200 && loginData.data?.token, 'Admin login succeeds and returns token');
    const token = loginData.data.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. Test Issues Endpoints
    console.log('\n2. Testing Issues Endpoints...');
    const issuesRes = await fetch(`${BASE_URL}/issues`, { headers: authHeaders });
    const issuesData = await issuesRes.json();

    assert(issuesRes.status === 200, 'GET /api/issues returns 200');
    assert(Array.isArray(issuesData.data) && issuesData.data.length > 0, 'GET /api/issues returns array with seeded issues');

    const firstIssueId = issuesData.data[0].id;
    const issueDetailRes = await fetch(`${BASE_URL}/issues/${firstIssueId}`, { headers: authHeaders });
    const issueDetailData = await issueDetailRes.json();

    assert(issueDetailRes.status === 200 && issueDetailData.data.id === firstIssueId, 'GET /api/issues/:id returns issue with details');

    // Create an issue
    const createIssueRes = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Integration Test Issue',
        description: 'Testing frontend endpoint integration ticket',
        type: 'delayed_delivery',
        priority: 'high',
      }),
    });
    const createIssueData = await createIssueRes.json();

    assert(createIssueRes.status === 201 && createIssueData.data?.issue_number, 'POST /api/issues creates ticket and returns 201');
    const createdIssueId = createIssueData.data?.id;

    // Update issue
    const updateIssueRes = await fetch(`${BASE_URL}/issues/${createdIssueId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'in_progress',
        resolution: 'Being evaluated in integration test',
      }),
    });
    const updateIssueData = await updateIssueRes.json();

    assert(updateIssueRes.status === 200 && updateIssueData.data?.status === 'in_progress', 'PATCH /api/issues/:id updates status');

    // 3. Test Orders Endpoints
    console.log('\n3. Testing Orders Endpoints...');
    const ordersRes = await fetch(`${BASE_URL}/orders`, { headers: authHeaders });
    const ordersData = await ordersRes.json();

    assert(ordersRes.status === 200, 'GET /api/orders returns 200');
    assert(Array.isArray(ordersData.data) && ordersData.data.length > 0, 'GET /api/orders returns array of orders');

    // Get ORD-1003 details
    const orderDetailRes = await fetch(`${BASE_URL}/orders/ORD-1003`, { headers: authHeaders });
    const orderDetailData = await orderDetailRes.json();

    assert(orderDetailRes.status === 200 && orderDetailData.data?.order_number === 'ORD-1003', 'GET /api/orders/ORD-1003 retrieves order details');
    assert(Array.isArray(orderDetailData.data?.items) && orderDetailData.data.items.length > 0, 'GET /api/orders/:id joins order items');

    // 4. Test Dashboard Endpoints
    console.log('\n4. Testing Dashboard Endpoints...');
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, { headers: authHeaders });
    const statsData = await statsRes.json();

    assert(statsRes.status === 200, 'GET /api/dashboard/stats returns 200');
    assert(typeof statsData.data?.totalIssues === 'number', 'GET /api/dashboard/stats returns totalIssues metric');
    assert(typeof statsData.data?.totalOrders === 'number', 'GET /api/dashboard/stats returns totalOrders metric');

    const activityRes = await fetch(`${BASE_URL}/dashboard/activity`, { headers: authHeaders });
    const activityData = await activityRes.json();

    assert(activityRes.status === 200, 'GET /api/dashboard/activity returns 200');
    assert(Array.isArray(activityData.data?.recentActions), 'GET /api/dashboard/activity returns recentActions list');

    // 5. Test Analytics Endpoints
    console.log('\n5. Testing Analytics Endpoints...');
    const analyticsOverviewRes = await fetch(`${BASE_URL}/analytics/overview`, { headers: authHeaders });
    const analyticsOverviewData = await analyticsOverviewRes.json();

    assert(analyticsOverviewRes.status === 200, 'GET /api/analytics/overview returns 200');
    assert(typeof analyticsOverviewData.data?.completionRate === 'number', 'GET /api/analytics/overview returns completionRate');

    const agentMetricsRes = await fetch(`${BASE_URL}/analytics/agents`, { headers: authHeaders });
    const agentMetricsData = await agentMetricsRes.json();

    assert(agentMetricsRes.status === 200, 'GET /api/analytics/agents returns 200');
    assert(Array.isArray(agentMetricsData.data) && agentMetricsData.data.length === 6, 'GET /api/analytics/agents returns metrics for all 6 agent roles');

    // Clean up created test issue
    if (createdIssueId) {
      await supabase.from('issues').delete().eq('id', createdIssueId);
    }
  } catch (err) {
    console.error('Integration test encountered unexpected error:', err);
    failed++;
  } finally {
    if (server) server.close();
  }

  console.log('\n============================================================');
  console.log(`FRONTEND INTEGRATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

runFrontendIntegrationTests();
