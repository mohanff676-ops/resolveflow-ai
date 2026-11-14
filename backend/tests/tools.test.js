import {
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
  executeTool,
} from '../src/tools/index.js';
import { supabase } from '../src/config/database.js';

async function testToolsSuite() {
  console.log('\n============================================================');
  console.log('             RESOLVEFLOW AI - 12 TOOLS TEST SUITE           ');
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

  try {
    // 1. Tool 1: getOrderDetails
    console.log('1. Testing Tool 1: getOrderDetails...');
    const ord1 = await executeTool('getOrderDetails', { orderId: 'ORD-1003' });
    assert(
      ord1.success && ord1.data.found && ord1.data.order.order_number === 'ORD-1003' && ord1.data.order.items.length === 2,
      'getOrderDetails retrieves ORD-1003 with line items and customer'
    );

    const ordNotFound = await executeTool('getOrderDetails', { orderId: 'ORD-9999' });
    assert(ordNotFound.success && !ordNotFound.data.found, 'getOrderDetails gracefully handles non-existent order');

    // 2. Tool 2: getCustomerDetails
    console.log('2. Testing Tool 2: getCustomerDetails...');
    const cust1 = await executeTool('getCustomerDetails', { customerId: 'emily.d@example.com' });
    assert(cust1.success && cust1.data.found && cust1.data.customer.name === 'Emily Davis', 'getCustomerDetails retrieves customer by email');

    // 3. Tool 3: getPaymentStatus
    console.log('3. Testing Tool 3: getPaymentStatus...');
    const pay1 = await executeTool('getPaymentStatus', { orderId: 'ORD-1003' });
    assert(pay1.success && pay1.data.payment_status === 'COMPLETED' && pay1.data.amount_paid === 239.98, 'getPaymentStatus returns verified completed payment');

    // 4. Tool 4: getDeliveryStatus
    console.log('4. Testing Tool 4: getDeliveryStatus...');
    const del1 = await executeTool('getDeliveryStatus', { orderId: 'ORD-1003' });
    assert(
      del1.success && del1.data.is_delayed && del1.data.delay_days >= 3 && del1.data.carrier.includes('FedEx'),
      'getDeliveryStatus confirms 3-day SLA delay and carrier status'
    );

    // 5. Tool 5: getPreviousComplaints
    console.log('5. Testing Tool 5: getPreviousComplaints...');
    const comp1 = await executeTool('getPreviousComplaints', { customerId: 'emily.d@example.com' });
    assert(comp1.success && Array.isArray(comp1.data.complaints), 'getPreviousComplaints returns complaint history array');

    // 6. Tool 6: getInventoryDetails
    console.log('6. Testing Tool 6: getInventoryDetails...');
    const inv1 = await executeTool('getInventoryDetails', { productId: 'SWP-003' });
    assert(inv1.success && inv1.data.found && inv1.data.product.sku === 'SWP-003', 'getInventoryDetails returns product stock and specs');

    // 7. Tool 7: createSupportIssue
    console.log('7. Testing Tool 7: createSupportIssue...');
    const emilyCust = cust1.data.customer;
    const issueRes = await executeTool('createSupportIssue', {
      customer_id: emilyCust.id,
      order_id: 'ORD-1003',
      type: 'delayed_delivery',
      priority: 'high',
      title: 'Automated QA Test Ticket',
      description: 'Verified test issue for automated tools suite.',
    });
    assert(issueRes.success && issueRes.data.issue.issue_number.startsWith('ISS-'), 'createSupportIssue successfully persists issue');
    const createdIssueId = issueRes.data?.issue?.id;

    // 8. Tool 8: createDeliveryEscalation
    console.log('8. Testing Tool 8: createDeliveryEscalation...');
    const escRes = await executeTool('createDeliveryEscalation', {
      order_id: 'ORD-1003',
      reason: '3 days delayed in regional hub',
      priority: 'high',
    });
    assert(escRes.success && escRes.data.status === 'ESCALATED_TO_CARRIER', 'createDeliveryEscalation updates order notes and audits escalation');

    // 9. Tool 9: createRefundRequest
    console.log('9. Testing Tool 9: createRefundRequest...');
    const refRes = await executeTool('createRefundRequest', {
      order_id: 'ORD-1003',
      amount: 239.98,
      reason: 'Delayed delivery over threshold',
    });
    assert(
      refRes.success && refRes.data.requires_approval === true && refRes.data.approval_status === 'PENDING_ADMIN_APPROVAL',
      'createRefundRequest correctly requires admin approval when amount > $50'
    );

    // 10. Tool 10: updateIssueStatus
    console.log('10. Testing Tool 10: updateIssueStatus...');
    if (createdIssueId) {
      const upRes = await executeTool('updateIssueStatus', {
        issueId: createdIssueId,
        status: 'investigating',
        resolution: 'Under agent investigation',
      });
      assert(upRes.success && upRes.data.issue.status === 'investigating', 'updateIssueStatus updates status and resolution in DB');
    }

    // 11. Tool 11: requestAdminApproval
    console.log('11. Testing Tool 11: requestAdminApproval...');
    // Create ephemeral workflow record for testing tool 11 & 12
    const { data: testWf } = await supabase
      .from('workflows')
      .insert([{ trigger_message: 'Tools Test Workflow', status: 'running' }])
      .select('id')
      .single();

    const appReq = await executeTool('requestAdminApproval', {
      workflow_id: testWf.id,
      action_type: 'refund',
      details: { amount: 239.98, order_id: 'ORD-1003' },
      reason: 'Automated test approval request',
    });
    assert(appReq.success && appReq.data.status === 'pending', 'requestAdminApproval records pending approval in DB');

    // Test duplicate approval prevention
    const dupAppReq = await executeTool('requestAdminApproval', {
      workflow_id: testWf.id,
      action_type: 'refund',
      details: { amount: 239.98, order_id: 'ORD-1003' },
      reason: 'Duplicate request test',
    });
    assert(dupAppReq.success && dupAppReq.data.already_pending, 'requestAdminApproval prevents duplicate pending requests');

    // 12. Tool 12: recordAgentAction
    console.log('12. Testing Tool 12: recordAgentAction...');
    const recAct = await executeTool('recordAgentAction', {
      workflow_id: testWf.id,
      tool_name: 'getOrderDetails',
      arguments: { orderId: 'ORD-1003' },
      result: { found: true },
      status: 'success',
    });
    assert(recAct.success && recAct.data.action.tool_name === 'getOrderDetails', 'recordAgentAction logs execution to agent_actions');

    // 13. Zod Argument Validation Rejection
    console.log('13. Testing Zod Validation on Tool Invocation...');
    const badArgs = await executeTool('createRefundRequest', {
      order_id: 'ORD-1003',
      amount: -50, // Invalid negative amount
      reason: 'Too short',
    });
    assert(!badArgs.success && badArgs.error.includes('amount must be positive'), 'executeTool rejects invalid arguments via Zod');

    // 14. Unregistered Tool Rejection
    console.log('14. Testing Whitelist Security Rejection...');
    const unreg = await executeTool('executeArbitrarySQL', { query: 'DROP TABLE users;' });
    assert(!unreg.success && unreg.error.includes('not registered or permitted'), 'executeTool rejects non-whitelisted functions');

    // Cleanup ephemeral test records
    if (createdIssueId) {
      await supabase.from('issues').delete().eq('id', createdIssueId);
    }
    if (testWf?.id) {
      await supabase.from('approvals').delete().eq('workflow_id', testWf.id);
      await supabase.from('agent_actions').delete().eq('workflow_id', testWf.id);
      await supabase.from('workflows').delete().eq('id', testWf.id);
    }

  } catch (err) {
    console.error('Tools suite unexpected error:', err);
    failed++;
  }

  console.log('\n============================================================');
  console.log(`TOOLS TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

testToolsSuite();
