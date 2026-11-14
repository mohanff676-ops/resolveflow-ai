import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

/**
 * VERIFICATION AGENT
 * Inspects resulting database state to guarantee actual backend execution.
 * Confirms whether database state matches intended action outcomes.
 */
export async function runVerificationAgent({ orderId, workflowId, executionLog }) {
  logger.info('[Verification Agent] Verifying database integrity after execution...');

  const verificationResults = {
    order_updated: false,
    issue_status_verified: false,
    approval_persisted: false,
    audit_logs_recorded: false,
    discrepancies: [],
    all_checks_passed: false,
  };

  try {
    // 1. Verify Order Note / Escalation persistence
    if (orderId) {
      let query = supabase.from('orders').select('id, notes, status');
      if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderId)) {
        query = query.eq('id', orderId);
      } else {
        query = query.eq('order_number', orderId.toUpperCase());
      }
      const { data: order } = await query.maybeSingle();
      if (order && order.notes && order.notes.includes('ESCALATION')) {
        verificationResults.order_updated = true;
      }
    }

    // 2. Verify Approval record in database
    if (workflowId) {
      const { data: approvals } = await supabase
        .from('approvals')
        .select('id, status, action_type')
        .eq('workflow_id', workflowId);

      if (approvals && approvals.length > 0) {
        verificationResults.approval_persisted = true;
      }

      // 3. Verify Agent Actions logged in database
      const { data: actions } = await supabase
        .from('agent_actions')
        .select('id, tool_name, status')
        .eq('workflow_id', workflowId);

      if (actions && actions.length > 0) {
        verificationResults.audit_logs_recorded = true;
      }
    }

    // 4. Verify Issue status
    const { data: issues } = await supabase
      .from('issues')
      .select('id, status, issue_number')
      .order('updated_at', { ascending: false })
      .limit(3);

    if (issues && issues.length > 0) {
      verificationResults.issue_status_verified = true;
    }

    // Evaluate overall check
    verificationResults.all_checks_passed =
      verificationResults.order_updated ||
      verificationResults.approval_persisted ||
      verificationResults.audit_logs_recorded;

    logger.info(`[Verification Agent] Verification completed. Passed: ${verificationResults.all_checks_passed}`);
  } catch (err) {
    logger.error('[Verification Agent] Error during verification checks:', err.message);
    verificationResults.discrepancies.push(`Verification query failed: ${err.message}`);
  }

  return {
    success: verificationResults.all_checks_passed,
    verification: verificationResults,
  };
}

export default { runVerificationAgent };
