-- ============================================================================
-- ResolveFlow AI - Database Migration
-- 001_create_tables.sql
-- Creates all core tables, constraints, indexes, and documentation comments.
-- ============================================================================

-- Enable pgcrypto extension for gen_random_uuid() if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','delayed')),
    total_amount DECIMAL(10,2) NOT NULL,
    order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    shipping_address JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. ORDER_ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- ============================================================================
-- 6. ISSUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('delayed_delivery','missing_item','wrong_item','damaged_item','refund_request','general_inquiry','payment_issue')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','in_progress','awaiting_approval','resolved','closed','escalated')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. WORKFLOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    trigger_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','awaiting_approval','completed','failed','cancelled')),
    execution_plan JSONB,
    result JSONB,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 8. AGENT_TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    agent_role TEXT NOT NULL CHECK (agent_role IN ('intake','investigation','decision','execution','verification','monitoring')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','skipped')),
    input JSONB,
    output JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- 9. AGENT_ACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    arguments JSONB,
    result JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed')),
    error TEXT,
    executed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 10. APPROVALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('refund','cancellation','financial_adjustment','escalation')),
    details JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed')),
    requested_at TIMESTAMPTZ DEFAULT now(),
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    execution_result JSONB
);

-- ============================================================================
-- 11. AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 12. BUSINESS_POLICIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_key TEXT UNIQUE NOT NULL,
    policy_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_issues_issue_number ON issues(issue_number);
CREATE INDEX IF NOT EXISTS idx_issues_customer_id ON issues(customer_id);
CREATE INDEX IF NOT EXISTS idx_issues_order_id ON issues(order_id);
CREATE INDEX IF NOT EXISTS idx_workflows_issue_id ON workflows(issue_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workflow_id ON agent_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_workflow_id ON agent_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_task_id ON agent_actions(task_id);
CREATE INDEX IF NOT EXISTS idx_approvals_workflow_id ON approvals(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE users IS 'User accounts with authentication credentials and operator/admin roles.';
COMMENT ON TABLE customers IS 'Customer details including contact information and shipping addresses.';
COMMENT ON TABLE products IS 'Product catalog with SKU, pricing, inventory count, and categorization.';
COMMENT ON TABLE orders IS 'Customer orders with delivery timelines, totals, and fulfillment statuses.';
COMMENT ON TABLE order_items IS 'Line items for orders referencing products and quantities.';
COMMENT ON TABLE issues IS 'Customer support issues and complaints tracking resolution workflows.';
COMMENT ON TABLE workflows IS 'Autonomous resolution workflow instances triggered by customer issues or messages.';
COMMENT ON TABLE agent_tasks IS 'Granular subtasks executed by specialized AI agents within a workflow.';
COMMENT ON TABLE agent_actions IS 'Specific tool invocations and actions executed by agents during tasks.';
COMMENT ON TABLE approvals IS 'Human-in-the-loop approval requests for high-impact actions like refunds and cancellations.';
COMMENT ON TABLE audit_logs IS 'Append-only audit trail tracking user and system actions across entities.';
COMMENT ON TABLE business_policies IS 'Configurable business rules and thresholds guiding automated agent decisions.';
