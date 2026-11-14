import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

/**
 * MONITORING AGENT
 * Maintains workflow lifecycle, persists agent task checkpoints, tracks execution metrics,
 * and compiles auditable timeline logs for frontend observability.
 */
export class MonitoringAgent {
  constructor(workflowId) {
    this.workflowId = workflowId;
    this.tasks = {};
  }

  /**
   * Start a task checkpoint for an agent role
   */
  async startTask(agentRole, inputData = {}) {
    try {
      const { data: task, error } = await supabase
        .from('agent_tasks')
        .insert([
          {
            workflow_id: this.workflowId,
            agent_role: agentRole,
            status: 'running',
            input: inputData,
            started_at: new Date().toISOString(),
          },
        ])
        .select('*')
        .single();

      if (!error && task) {
        this.tasks[agentRole] = task;
        return task;
      }
    } catch (err) {
      logger.error(`[Monitoring Agent] Error starting task for ${agentRole}:`, err.message);
    }
    return { id: null, agent_role: agentRole, status: 'running' };
  }

  /**
   * Complete an agent task checkpoint
   */
  async completeTask(agentRole, outputData = {}, isSuccess = true, errorMsg = null) {
    const task = this.tasks[agentRole];
    if (!task?.id) return;

    try {
      await supabase
        .from('agent_tasks')
        .update({
          status: isSuccess ? 'completed' : 'failed',
          output: outputData,
          error: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);
    } catch (err) {
      logger.error(`[Monitoring Agent] Error completing task for ${agentRole}:`, err.message);
    }
  }

  /**
   * Record a tool action in agent_actions table
   */
  async recordAction(toolName, args, result, agentRole = 'execution') {
    const taskId = this.tasks[agentRole]?.id || null;
    const isSuccess = result?.success !== false;

    try {
      await supabase.from('agent_actions').insert([
        {
          workflow_id: this.workflowId,
          task_id: taskId,
          tool_name: toolName,
          arguments: args || {},
          result: result?.data || result || null,
          status: isSuccess ? 'success' : 'failed',
          error: result?.error || null,
          executed_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      logger.error(`[Monitoring Agent] Error recording action ${toolName}:`, err.message);
    }
  }

  /**
   * Finalize the entire workflow
   */
  async finalizeWorkflow({ status, result, executionPlan }) {
    try {
      await supabase
        .from('workflows')
        .update({
          status,
          result,
          execution_plan: executionPlan,
          completed_at: new Date().toISOString(),
        })
        .eq('id', this.workflowId);

      logger.info(`[Monitoring Agent] Workflow ${this.workflowId} finalized with status: ${status}`);
    } catch (err) {
      logger.error(`[Monitoring Agent] Error finalizing workflow:`, err.message);
    }
  }
}

export default MonitoringAgent;
