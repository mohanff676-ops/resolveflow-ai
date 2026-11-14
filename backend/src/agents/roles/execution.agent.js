import { executeTool } from '../../tools/index.js';
import { logger } from '../../utils/logger.js';

/**
 * EXECUTION AGENT
 * Safely invokes approved backend tools according to the decision plan.
 * Halts before executing sensitive financial actions to enforce Human-in-the-Loop approval.
 */
export async function runExecutionAgent({ executionPlan, workflowId, taskId, onActionExecuted }) {
  logger.info(`[Execution Agent] Executing plan with ${executionPlan.length} steps...`);

  const executionLog = [];
  let requiresApproval = false;
  let pendingApprovalDetails = null;
  let hasFailedSteps = false;

  for (const step of executionPlan) {
    const { tool, arguments: args } = step;
    logger.info(`[Execution Agent] Step ${step.step}: Invoking tool "${tool}"`);

    // Inject workflow_id if tool accepts it
    const augmentedArgs = {
      ...args,
      ...(tool === 'createRefundRequest' || tool === 'requestAdminApproval' ? { workflow_id: workflowId } : {}),
    };

    // Execute tool
    const result = await executeTool(tool, augmentedArgs);

    // Record action
    if (onActionExecuted) {
      await onActionExecuted(tool, augmentedArgs, result);
    }

    if (!result.success) {
      hasFailedSteps = true;
    }

    executionLog.push({
      step: step.step,
      tool,
      arguments: augmentedArgs,
      success: result.success,
      output: result.data || result.error,
    });

    // If a required tool fails, halt execution safely
    if (!result.success) {
      logger.error(`[Execution Agent] Tool "${tool}" failed: ${result.error}. Halting remaining steps.`);
      break;
    }

    // Check if tool triggered an approval requirement
    if (tool === 'createRefundRequest' && result.data?.requires_approval) {
      requiresApproval = true;
      pendingApprovalDetails = {
        tool,
        approval_id: result.data.approval_id,
        amount: result.data.amount,
        notice: result.data.notice,
      };
      logger.info(`[Execution Agent] Sensitive action paused: ${result.data.notice}`);
    }
  }

  logger.info('[Execution Agent] Execution phase concluded.');

  return {
    success: !hasFailedSteps,
    executionLog,
    requiresApproval,
    pendingApprovalDetails,
  };
}

export default { runExecutionAgent };
