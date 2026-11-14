-- ============================================================================
-- RESOLVEFLOW AI - TICKET CREATION & TRACKING MIGRATION (002)
-- ============================================================================
-- This migration enhances the issues and workflows schema to support public 
-- customer ticket tracking, non-sequential ticket IDs (e.g. RF-2026-A7K92),
-- and bidirectional relationships between issues and multi-agent workflows.

-- 1. Ensure database-level UNIQUE constraint on issues.issue_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'issues'::regclass 
      AND contype = 'u' 
      AND conname = 'issues_issue_number_key'
  ) THEN
    ALTER TABLE issues ADD CONSTRAINT issues_issue_number_key UNIQUE (issue_number);
  END IF;
END $$;

-- 2. Ensure index on issue_number for high-performance public ticket lookups
CREATE INDEX IF NOT EXISTS idx_issues_issue_number ON issues(issue_number);

-- 3. Ensure index on customer_id and order_id for customer verification lookups
CREATE INDEX IF NOT EXISTS idx_issues_customer_id ON issues(customer_id);
CREATE INDEX IF NOT EXISTS idx_issues_order_id ON issues(order_id);

-- 4. Ensure index on workflows.issue_id for progress tracking lookups
CREATE INDEX IF NOT EXISTS idx_workflows_issue_id ON workflows(issue_id);

-- 5. Ensure index on agent_tasks.workflow_id for fast step status resolution
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workflow_id ON agent_tasks(workflow_id);

-- 6. Ensure index on approvals.workflow_id for quick approval status checks
CREATE INDEX IF NOT EXISTS idx_approvals_workflow_id ON approvals(workflow_id);
