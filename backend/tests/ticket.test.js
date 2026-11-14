import { createTicket, getTicketByPublicId, getTicketProgress } from '../src/services/ticket.service.js';
import { supabase } from '../src/config/database.js';

async function runTicketTests() {
  console.log('\n============================================================');
  console.log('       RESOLVEFLOW AI - TICKET SYSTEM VERIFICATION          ');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Ticket creation and ID generation
    console.log('[Test 1] Creating a support ticket...');
    const testEmail = `test.customer.${Date.now()}@example.com`;
    const ticketResult = await createTicket({
      customer_name: 'Test Customer Sarah',
      customer_email: testEmail,
      order_id: 'ORD-1003',
      category: 'E-commerce',
      description: 'Order ORD-1003 has not arrived for three days. Please check status.',
    });

    assert(ticketResult && ticketResult.ticket_id, 'Ticket created with an ID');
    assert(/^RF-\d{4}-[A-Z0-9]{5}$/.test(ticketResult.ticket_id), `Ticket ID format matches RF-YYYY-XXXXX (${ticketResult.ticket_id})`);
    assert(ticketResult.customer_name === 'Test Customer Sarah', 'Customer name preserved');
    assert(ticketResult.customer_email === testEmail, 'Customer email normalized');
    assert(ticketResult.status === 'investigating', 'Initial ticket status is investigating');

    // TEST 2: Verify database record existence
    console.log('\n[Test 2] Verifying ticket persistence in Supabase...');
    const { data: dbRecord, error: dbErr } = await supabase
      .from('issues')
      .select('*, customer:customers(name, email)')
      .eq('issue_number', ticketResult.ticket_id)
      .single();

    assert(!dbErr && dbRecord, 'Ticket record exists in database issues table');
    assert(dbRecord.customer?.email === testEmail, 'Customer relationship persisted');

    // TEST 3: Public Ticket Lookup with correct email
    console.log('\n[Test 3] Testing public ticket lookup with valid ownership...');
    const lookup = await getTicketByPublicId(ticketResult.ticket_id, testEmail);
    assert(lookup && lookup.ticket_id === ticketResult.ticket_id, 'Lookup succeeded with correct email');
    assert(lookup.customer_name === 'Test Customer Sarah', 'Safe customer name returned');
    assert(!lookup.raw_tools, 'Raw agent tools NOT exposed to customer');
    assert(!lookup.internal_reasoning, 'Internal reasoning NOT exposed to customer');

    // TEST 4: Ownership Verification Failure (Mismatched Email)
    console.log('\n[Test 4] Testing ownership verification failure (mismatched email)...');
    try {
      await getTicketByPublicId(ticketResult.ticket_id, 'intruder@attacker.com');
      assert(false, 'Should have rejected mismatched email');
    } catch (e) {
      assert(e.statusCode === 403, `Correctly rejected mismatched email with 403 Forbidden: ${e.message}`);
    }

    // TEST 5: Non-existent Ticket ID Lookup
    console.log('\n[Test 5] Testing non-existent ticket ID lookup...');
    try {
      await getTicketByPublicId('RF-2026-INVALID99', testEmail);
      assert(false, 'Should have failed on invalid ticket ID');
    } catch (e) {
      assert(e.statusCode === 404, `Correctly returned 404 for non-existent ticket: ${e.message}`);
    }

    // TEST 6: Customer 7-Step Progress Timeline
    console.log('\n[Test 6] Testing 7-step customer progress timeline...');
    const progress = await getTicketProgress(ticketResult.ticket_id, testEmail);
    assert(progress && Array.isArray(progress.steps), 'Progress returned steps array');
    assert(progress.steps.length === 7, `Timeline contains exactly 7 steps (received: ${progress.steps.length})`);
    assert(progress.steps[0].name === 'Ticket Received' && progress.steps[0].status === 'completed', 'Step 1 is "Ticket Received" and marked completed');
    assert(progress.steps[6].name === 'Resolved or Closed', 'Step 7 is "Resolved or Closed"');

    // Clean up test ticket
    await supabase.from('issues').delete().eq('issue_number', ticketResult.ticket_id);
    await supabase.from('customers').delete().eq('email', testEmail);

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n============================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

runTicketTests();
