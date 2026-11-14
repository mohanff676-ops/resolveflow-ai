import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_URL.includes('your-project')) {
  console.log('\n============================================================');
  console.log('              RESOLVEFLOW AI - SEED SCRIPT                  ');
  console.log('============================================================\n');
  console.log('Supabase credentials not configured in backend/.env.');
  console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run seed.\n');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Deterministic RFC 4122 Compliant Hexadecimal UUIDs
// Standard UUID hex characters: [0-9a-fA-F]
// Structure: 8-4-4-4-12 hex digits
const IDS = {
  users: {
    admin: 'a0000000-0000-0000-0000-000000000001',
    operator: 'a0000000-0000-0000-0000-000000000002',
  },
  customers: {
    sarah: 'c0000000-0000-0000-0000-000000000001',
    mike: 'c0000000-0000-0000-0000-000000000002',
    emily: 'c0000000-0000-0000-0000-000000000003',
    james: 'c0000000-0000-0000-0000-000000000004',
    lisa: 'c0000000-0000-0000-0000-000000000005',
  },
  products: {
    headphones: 'b0000000-0000-0000-0000-000000000001',
    chair: 'b0000000-0000-0000-0000-000000000002',
    smartwatch: 'b0000000-0000-0000-0000-000000000003',
    coffee: 'b0000000-0000-0000-0000-000000000004',
    hub: 'b0000000-0000-0000-0000-000000000005',
    desk: 'b0000000-0000-0000-0000-000000000006',
    earbuds: 'b0000000-0000-0000-0000-000000000007',
    yogamat: 'b0000000-0000-0000-0000-000000000008',
    keyboard: 'b0000000-0000-0000-0000-000000000009',
    powerbank: 'b0000000-0000-0000-0000-000000000010',
  },
  orders: {
    ord1001: 'd0000000-0000-0000-0000-000000000001',
    ord1002: 'd0000000-0000-0000-0000-000000000002',
    ord1003: 'd0000000-0000-0000-0000-000000000003', // Primary Demo Order: Emily Davis, 3 days late
    ord1004: 'd0000000-0000-0000-0000-000000000004',
    ord1005: 'd0000000-0000-0000-0000-000000000005',
    ord1006: 'd0000000-0000-0000-0000-000000000006',
    ord1007: 'd0000000-0000-0000-0000-000000000007',
    ord1008: 'd0000000-0000-0000-0000-000000000008',
    ord1009: 'd0000000-0000-0000-0000-000000000009',
    ord1010: 'd0000000-0000-0000-0000-000000000010',
  },
  issues: {
    iss1001: 'e0000000-0000-0000-0000-000000000001',
    iss1002: 'e0000000-0000-0000-0000-000000000002',
    iss1003: 'e0000000-0000-0000-0000-000000000003',
    iss1004: 'e0000000-0000-0000-0000-000000000004',
    iss1005: 'e0000000-0000-0000-0000-000000000005',
  },
  workflows: {
    wf1001: 'f0000000-0000-0000-0000-000000000001',
    wf1002: 'f0000000-0000-0000-0000-000000000002',
  },
  approvals: {
    app1001: 'a1000000-0000-0000-0000-000000000001',
    app1002: 'a1000000-0000-0000-0000-000000000002',
  },
  auditLogs: {
    log1: '10000000-0000-0000-0000-000000000001',
    log2: '10000000-0000-0000-0000-000000000002',
  },
};

// Validate that every UUID string conforms strictly to Postgres UUID syntax
function validateUUIDs(obj, path = '') {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof val === 'string') {
      if (!uuidRegex.test(val)) {
        throw new Error(`Invalid UUID format at ${currentPath}: "${val}"`);
      }
    } else if (typeof val === 'object' && val !== null) {
      validateUUIDs(val, currentPath);
    }
  }
}

async function seed() {
  console.log('============================================================');
  console.log('           RESOLVEFLOW AI - DATABASE SEED RUNNER            ');
  console.log('============================================================\n');

  // Step 1: Pre-flight validation of all seed UUIDs
  console.log('Validating UUID syntax for all seed identifiers...');
  validateUUIDs(IDS);
  console.log('  -> All UUIDs confirmed valid RFC 4122 hexadecimal strings.\n');

  // Step 2: Clean ONLY demo records in reverse foreign-key dependency order
  console.log('Cleaning existing demo records (preserving any unrelated data)...');

  // A. Audit Logs for demo entities
  await supabase
    .from('audit_logs')
    .delete()
    .in('id', Object.values(IDS.auditLogs));

  // B. Approvals for demo workflows
  await supabase
    .from('approvals')
    .delete()
    .in('id', Object.values(IDS.approvals));

  // C. Workflows
  await supabase
    .from('workflows')
    .delete()
    .in('id', Object.values(IDS.workflows));

  // D. Issues
  await supabase
    .from('issues')
    .delete()
    .in('id', Object.values(IDS.issues));

  // E. Order items referencing demo orders
  await supabase
    .from('order_items')
    .delete()
    .in('order_id', Object.values(IDS.orders));

  // F. Orders
  await supabase
    .from('orders')
    .delete()
    .in('id', Object.values(IDS.orders));

  // G. Products
  await supabase
    .from('products')
    .delete()
    .in('id', Object.values(IDS.products));

  // H. Customers
  await supabase
    .from('customers')
    .delete()
    .in('id', Object.values(IDS.customers));

  // I. Business Policies
  await supabase
    .from('business_policies')
    .delete()
    .in('policy_key', ['refund_policy', 'delivery_sla', 'escalation_policy', 'compensation_policy']);

  // J. Users
  await supabase
    .from('users')
    .delete()
    .in('id', Object.values(IDS.users));

  console.log('  -> Previous demo records cleaned successfully.\n');

  // Step 3: Insert Users
  console.log('1. Seeding Users (2 records)...');
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const operatorPasswordHash = await bcrypt.hash('operator123', salt);

  const { error: userErr } = await supabase.from('users').insert([
    {
      id: IDS.users.admin,
      email: 'admin@resolveflow.ai',
      password_hash: adminPasswordHash,
      name: 'System Admin',
      role: 'admin',
    },
    {
      id: IDS.users.operator,
      email: 'operator@resolveflow.ai',
      password_hash: operatorPasswordHash,
      name: 'Operations Lead',
      role: 'operator',
    },
  ]);
  if (userErr) throw new Error(`Users insert failed: ${userErr.message}`);

  // Step 4: Insert Customers
  console.log('2. Seeding Customers (5 records)...');
  const { error: custErr } = await supabase.from('customers').insert([
    {
      id: IDS.customers.sarah,
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '(123) 456-7890',
      address: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
    },
    {
      id: IDS.customers.mike,
      name: 'Mike Chen',
      email: 'mike.chen@example.com',
      phone: '(234) 567-8901',
      address: { street: '456 Oak Ave', city: 'Portland', state: 'OR', zip: '97201' },
    },
    {
      id: IDS.customers.emily,
      name: 'Emily Davis',
      email: 'emily.d@example.com',
      phone: '(345) 678-9012',
      address: { street: '789 Pine Rd', city: 'Austin', state: 'TX', zip: '73301' },
    },
    {
      id: IDS.customers.james,
      name: 'James Wilson',
      email: 'j.wilson@example.com',
      phone: '(456) 789-0123',
      address: { street: '321 Elm St', city: 'Denver', state: 'CO', zip: '80201' },
    },
    {
      id: IDS.customers.lisa,
      name: 'Lisa Anderson',
      email: 'lisa.a@example.com',
      phone: '(567) 890-1234',
      address: { street: '654 Maple Dr', city: 'Seattle', state: 'WA', zip: '98101' },
    },
  ]);
  if (custErr) throw new Error(`Customers insert failed: ${custErr.message}`);

  // Step 5: Insert Products
  console.log('3. Seeding Products (10 records)...');
  const { error: prodErr } = await supabase.from('products').insert([
    { id: IDS.products.headphones, name: 'Wireless Bluetooth Headphones', sku: 'WBH-001', price: 79.99, stock_quantity: 150, category: 'Electronics', description: 'Premium active noise-cancelling over-ear headphones.' },
    { id: IDS.products.chair, name: 'Ergonomic Office Chair', sku: 'EOC-002', price: 299.99, stock_quantity: 45, category: 'Furniture', description: 'Adjustable lumbar support breathable mesh chair.' },
    { id: IDS.products.smartwatch, name: 'Smart Watch Pro', sku: 'SWP-003', price: 199.99, stock_quantity: 200, category: 'Electronics', description: 'Fitness tracking, heart rate, GPS, water resistant.' },
    { id: IDS.products.coffee, name: 'Organic Coffee Beans 1kg', sku: 'OCB-004', price: 24.99, stock_quantity: 500, category: 'Food & Beverage', description: 'Single-origin medium roast Arabica whole beans.' },
    { id: IDS.products.hub, name: 'USB-C Hub Adapter', sku: 'UCH-005', price: 49.99, stock_quantity: 300, category: 'Electronics', description: '7-in-1 multi-port adapter with 4K HDMI & 100W PD.' },
    { id: IDS.products.desk, name: 'Standing Desk Converter', sku: 'SDC-006', price: 179.99, stock_quantity: 60, category: 'Furniture', description: 'Pneumatic height-adjustable dual tier tabletop riser.' },
    { id: IDS.products.earbuds, name: 'Noise Cancelling Earbuds', sku: 'NCE-007', price: 129.99, stock_quantity: 180, category: 'Electronics', description: 'True wireless in-ear buds with wireless charging case.' },
    { id: IDS.products.yogamat, name: 'Premium Yoga Mat', sku: 'PYM-008', price: 39.99, stock_quantity: 250, category: 'Sports', description: 'Eco-friendly non-slip extra thick exercise mat.' },
    { id: IDS.products.keyboard, name: 'Mechanical Keyboard RGB', sku: 'MKR-009', price: 89.99, stock_quantity: 120, category: 'Electronics', description: 'Tactile mechanical switches with per-key customizable RGB.' },
    { id: IDS.products.powerbank, name: 'Portable Power Bank 20000mAh', sku: 'PPB-010', price: 34.99, stock_quantity: 400, category: 'Electronics', description: 'High capacity fast charging dual USB-C power bank.' },
  ]);
  if (prodErr) throw new Error(`Products insert failed: ${prodErr.message}`);

  // Step 6: Insert Orders
  console.log('4. Seeding Orders (10 records)...');
  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: ordErr } = await supabase.from('orders').insert([
    {
      id: IDS.orders.ord1001,
      order_number: 'ORD-1001',
      customer_id: IDS.customers.sarah,
      status: 'delivered',
      total_amount: 129.98,
      order_date: daysAgo(15),
      expected_delivery: daysAgo(10),
      actual_delivery: daysAgo(9),
      shipping_address: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
      notes: 'Delivered on front porch.',
    },
    {
      id: IDS.orders.ord1002,
      order_number: 'ORD-1002',
      customer_id: IDS.customers.mike,
      status: 'shipped',
      total_amount: 299.99,
      order_date: daysAgo(5),
      expected_delivery: daysFromNow(2),
      shipping_address: { street: '456 Oak Ave', city: 'Portland', state: 'OR', zip: '97201' },
      notes: 'In transit via FedEx Ground.',
    },
    {
      id: IDS.orders.ord1003, // PRIMARY HACKATHON DEMO ORDER
      order_number: 'ORD-1003',
      customer_id: IDS.customers.emily,
      status: 'delayed',
      total_amount: 239.98,
      order_date: daysAgo(8),
      expected_delivery: daysAgo(3),
      actual_delivery: null,
      shipping_address: { street: '789 Pine Rd', city: 'Austin', state: 'TX', zip: '73301' },
      notes: 'Tracking stalled at central logistics transit hub 3 days past SLA.',
    },
    {
      id: IDS.orders.ord1004,
      order_number: 'ORD-1004',
      customer_id: IDS.customers.james,
      status: 'processing',
      total_amount: 84.97,
      order_date: daysAgo(2),
      expected_delivery: daysFromNow(5),
      shipping_address: { street: '321 Elm St', city: 'Denver', state: 'CO', zip: '80201' },
      notes: 'Awaiting warehouse pick & pack.',
    },
    {
      id: IDS.orders.ord1005,
      order_number: 'ORD-1005',
      customer_id: IDS.customers.lisa,
      status: 'delivered',
      total_amount: 179.99,
      order_date: daysAgo(20),
      expected_delivery: daysAgo(15),
      actual_delivery: daysAgo(14),
      shipping_address: { street: '654 Maple Dr', city: 'Seattle', state: 'WA', zip: '98101' },
      notes: 'Signed for by resident.',
    },
    {
      id: IDS.orders.ord1006,
      order_number: 'ORD-1006',
      customer_id: IDS.customers.sarah,
      status: 'pending',
      total_amount: 89.99,
      order_date: daysAgo(1),
      expected_delivery: daysFromNow(4),
      shipping_address: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
      notes: 'Order placed, awaiting payment confirmation.',
    },
    {
      id: IDS.orders.ord1007,
      order_number: 'ORD-1007',
      customer_id: IDS.customers.mike,
      status: 'cancelled',
      total_amount: 129.99,
      order_date: daysAgo(10),
      shipping_address: { street: '456 Oak Ave', city: 'Portland', state: 'OR', zip: '97201' },
      notes: 'Cancelled per customer request prior to shipment.',
    },
    {
      id: IDS.orders.ord1008,
      order_number: 'ORD-1008',
      customer_id: IDS.customers.emily,
      status: 'shipped',
      total_amount: 79.99,
      order_date: daysAgo(3),
      expected_delivery: daysFromNow(2),
      shipping_address: { street: '789 Pine Rd', city: 'Austin', state: 'TX', zip: '73301' },
      notes: 'Carrier on schedule.',
    },
    {
      id: IDS.orders.ord1009,
      order_number: 'ORD-1009',
      customer_id: IDS.customers.james,
      status: 'delivered',
      total_amount: 219.98,
      order_date: daysAgo(12),
      expected_delivery: daysAgo(7),
      actual_delivery: daysAgo(7),
      shipping_address: { street: '321 Elm St', city: 'Denver', state: 'CO', zip: '80201' },
      notes: 'Delivered to parcel locker.',
    },
    {
      id: IDS.orders.ord1010,
      order_number: 'ORD-1010',
      customer_id: IDS.customers.lisa,
      status: 'delayed',
      total_amount: 199.99,
      order_date: daysAgo(7),
      expected_delivery: daysAgo(2),
      actual_delivery: null,
      shipping_address: { street: '654 Maple Dr', city: 'Seattle', state: 'WA', zip: '98101' },
      notes: 'Carrier delayed due to severe weather.',
    },
  ]);
  if (ordErr) throw new Error(`Orders insert failed: ${ordErr.message}`);

  // Step 7: Insert Order Items (14 items)
  console.log('5. Seeding Order Items (14 records)...');
  const { error: itemErr } = await supabase.from('order_items').insert([
    { order_id: IDS.orders.ord1001, product_id: IDS.products.headphones, quantity: 1, unit_price: 79.99 },
    { order_id: IDS.orders.ord1001, product_id: IDS.products.hub, quantity: 1, unit_price: 49.99 },
    { order_id: IDS.orders.ord1002, product_id: IDS.products.chair, quantity: 1, unit_price: 299.99 },
    { order_id: IDS.orders.ord1003, product_id: IDS.products.smartwatch, quantity: 1, unit_price: 199.99 },
    { order_id: IDS.orders.ord1003, product_id: IDS.products.yogamat, quantity: 1, unit_price: 39.99 },
    { order_id: IDS.orders.ord1004, product_id: IDS.products.coffee, quantity: 2, unit_price: 24.99 },
    { order_id: IDS.orders.ord1004, product_id: IDS.products.powerbank, quantity: 1, unit_price: 34.99 },
    { order_id: IDS.orders.ord1005, product_id: IDS.products.desk, quantity: 1, unit_price: 179.99 },
    { order_id: IDS.orders.ord1006, product_id: IDS.products.keyboard, quantity: 1, unit_price: 89.99 },
    { order_id: IDS.orders.ord1007, product_id: IDS.products.earbuds, quantity: 1, unit_price: 129.99 },
    { order_id: IDS.orders.ord1008, product_id: IDS.products.headphones, quantity: 1, unit_price: 79.99 },
    { order_id: IDS.orders.ord1009, product_id: IDS.products.earbuds, quantity: 1, unit_price: 129.99 },
    { order_id: IDS.orders.ord1009, product_id: IDS.products.keyboard, quantity: 1, unit_price: 89.99 },
    { order_id: IDS.orders.ord1010, product_id: IDS.products.smartwatch, quantity: 1, unit_price: 199.99 },
  ]);
  if (itemErr) throw new Error(`Order Items insert failed: ${itemErr.message}`);

  // Step 8: Insert Issues (5 records)
  console.log('6. Seeding Issues (5 records)...');
  const { error: issErr } = await supabase.from('issues').insert([
    {
      id: IDS.issues.iss1001,
      issue_number: 'ISS-1001',
      order_id: IDS.orders.ord1003,
      customer_id: IDS.customers.emily,
      type: 'delayed_delivery',
      priority: 'high',
      status: 'open',
      title: 'Order ORD-1003 has not arrived (3 days late)',
      description: 'Customer Emily Davis reports order ORD-1003 was due 3 days ago. Requesting investigation and status update or refund.',
    },
    {
      id: IDS.issues.iss1002,
      issue_number: 'ISS-1002',
      order_id: IDS.orders.ord1007,
      customer_id: IDS.customers.mike,
      type: 'refund_request',
      priority: 'medium',
      status: 'resolved',
      title: 'Cancelled order refund request',
      description: 'Customer cancelled order ORD-1007 before shipment; requesting card reimbursement.',
      resolution: 'Refund of $129.99 approved and executed successfully.',
      assigned_to: IDS.users.admin,
    },
    {
      id: IDS.issues.iss1003,
      issue_number: 'ISS-1003',
      order_id: IDS.orders.ord1001,
      customer_id: IDS.customers.sarah,
      type: 'damaged_item',
      priority: 'medium',
      status: 'closed',
      title: 'Headphones cracked on arrival',
      description: 'Customer received headphones with cracked headband.',
      resolution: 'Replacement unit expedited to customer address.',
      assigned_to: IDS.users.operator,
    },
    {
      id: IDS.issues.iss1004,
      issue_number: 'ISS-1004',
      order_id: IDS.orders.ord1010,
      customer_id: IDS.customers.lisa,
      type: 'delayed_delivery',
      priority: 'high',
      status: 'awaiting_approval',
      title: 'Smart Watch shipment delayed 2 days',
      description: 'Customer requesting full refund due to delivery delay exceeding threshold.',
    },
    {
      id: IDS.issues.iss1005,
      issue_number: 'ISS-1005',
      order_id: IDS.orders.ord1009,
      customer_id: IDS.customers.james,
      type: 'wrong_item',
      priority: 'low',
      status: 'open',
      title: 'Received wrong keyboard switch type',
      description: 'Customer ordered Red switches, received Blue switches.',
    },
  ]);
  if (issErr) throw new Error(`Issues insert failed: ${issErr.message}`);

  // Step 9: Insert Workflows & Approvals
  console.log('7. Seeding Workflows & Approvals (2 workflows, 2 approvals)...');
  const { error: wfErr } = await supabase.from('workflows').insert([
    {
      id: IDS.workflows.wf1001,
      issue_id: IDS.issues.iss1002,
      trigger_message: 'Please process refund for cancelled order ORD-1007.',
      status: 'completed',
      execution_plan: { steps: ['intake', 'investigation', 'decision', 'execution', 'verification'] },
      result: { resolution: 'Refund approved and executed for $129.99' },
      created_by: IDS.users.admin,
    },
    {
      id: IDS.workflows.wf1002,
      issue_id: IDS.issues.iss1004,
      trigger_message: 'Customer requested refund for delayed watch order ORD-1010.',
      status: 'awaiting_approval',
      execution_plan: { steps: ['intake', 'investigation', 'decision', 'approval_pending'] },
      created_by: IDS.users.operator,
    },
  ]);
  if (wfErr) throw new Error(`Workflows insert failed: ${wfErr.message}`);

  const { error: appErr } = await supabase.from('approvals').insert([
    {
      id: IDS.approvals.app1001,
      workflow_id: IDS.workflows.wf1001,
      action_type: 'refund',
      details: { order_id: IDS.orders.ord1007, amount: 129.99, reason: 'Customer cancelled prior to shipment' },
      status: 'executed',
      decided_by: IDS.users.admin,
      decided_at: new Date().toISOString(),
      reason: 'Valid cancellation within return policy.',
      execution_result: { simulated_transfer_id: 'SIM_TX_987654', timestamp: new Date().toISOString() },
    },
    {
      id: IDS.approvals.app1002,
      workflow_id: IDS.workflows.wf1002,
      action_type: 'refund',
      details: { order_id: IDS.orders.ord1010, amount: 199.99, reason: 'Delayed delivery over threshold' },
      status: 'pending',
    },
  ]);
  if (appErr) throw new Error(`Approvals insert failed: ${appErr.message}`);

  // Step 10: Insert Business Policies
  console.log('8. Seeding Business Policies (4 policies)...');
  const { error: polErr } = await supabase.from('business_policies').insert([
    {
      policy_key: 'refund_policy',
      policy_value: {
        max_auto_refund: 50,
        refund_window_days: 30,
        requires_approval_above: 50,
        allow_refund_on_delay_days: 3,
      },
      description: 'Refund authorization thresholds and time windows.',
    },
    {
      policy_key: 'delivery_sla',
      policy_value: {
        standard_delivery_days: 5,
        express_delivery_days: 2,
        late_threshold_days: 2,
        critical_delay_threshold_days: 5,
      },
      description: 'Service level agreement definitions for order delivery.',
    },
    {
      policy_key: 'escalation_policy',
      policy_value: {
        auto_escalate_after_hours: 48,
        critical_priority_sla_hours: 4,
        carrier_escalation_enabled: true,
      },
      description: 'Rules for routing carrier escalations and internal priority tags.',
    },
    {
      policy_key: 'compensation_policy',
      policy_value: {
        late_delivery_discount_percent: 10,
        max_compensation: 50,
        offer_store_credit_bonus_percent: 15,
      },
      description: 'Goodwill compensation and discount guidelines for delayed orders.',
    },
  ]);
  if (polErr) throw new Error(`Business policies insert failed: ${polErr.message}`);

  // Step 11: Insert Audit Logs
  console.log('9. Seeding Audit Logs (2 records)...');
  const { error: logErr } = await supabase.from('audit_logs').insert([
    {
      id: IDS.auditLogs.log1,
      user_id: IDS.users.admin,
      action: 'refund_approved',
      entity_type: 'issues',
      entity_id: IDS.issues.iss1002,
      metadata: { amount: 129.99, order_id: IDS.orders.ord1007, reason: 'Approved under refund policy' },
    },
    {
      id: IDS.auditLogs.log2,
      user_id: IDS.users.admin,
      action: 'issue_resolved',
      entity_type: 'issues',
      entity_id: IDS.issues.iss1002,
      metadata: { resolution: 'Refund of $129.99 executed' },
    },
  ]);
  if (logErr) throw new Error(`Audit logs insert failed: ${logErr.message}`);

  // Step 12: Verification Queries
  console.log('\n============================================================');
  console.log('             DATABASE SEED VERIFICATION AUDIT               ');
  console.log('============================================================\n');

  const counts = {};
  const tables = [
    'users',
    'customers',
    'products',
    'orders',
    'order_items',
    'issues',
    'workflows',
    'approvals',
    'business_policies',
    'audit_logs',
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error verifying table "${table}":`, error.message);
      counts[table] = 'ERROR';
    } else {
      counts[table] = count;
    }
  }

  console.table(counts);

  console.log('\n✅ Database seeded successfully with valid UUIDs and verified in Supabase!');
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed with error:', err);
  process.exit(1);
});
