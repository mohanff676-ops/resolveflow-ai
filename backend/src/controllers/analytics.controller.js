import { supabase } from '../config/database.js';
import { success } from '../utils/response.js';

export const getOverview = async (req, res, next) => {
  try {
    const [
      { data: workflows },
      { data: issues },
      { data: policies },
      { data: approvals },
    ] = await Promise.all([
      supabase.from('workflows').select('id, status, started_at, completed_at'),
      supabase.from('issues').select('id, type, priority, status'),
      supabase.from('business_policies').select('*'),
      supabase.from('approvals').select('id, action_type, status'),
    ]);

    // Calculate workflow completion metrics
    const totalWorkflows = workflows?.length || 0;
    const completedWorkflows = workflows?.filter((w) => w.status === 'completed').length || 0;
    const awaitingApprovalWorkflows = workflows?.filter((w) => w.status === 'awaiting_approval').length || 0;
    const failedWorkflows = workflows?.filter((w) => w.status === 'failed').length || 0;

    // Calculate average duration of completed workflows
    let totalDurationMs = 0;
    let completedWithDuration = 0;
    workflows?.forEach((w) => {
      if (w.started_at && w.completed_at) {
        const dur = new Date(w.completed_at).getTime() - new Date(w.started_at).getTime();
        if (dur > 0) {
          totalDurationMs += dur;
          completedWithDuration++;
        }
      }
    });
    const avgDurationSeconds = completedWithDuration > 0
      ? Math.round(totalDurationMs / completedWithDuration / 1000)
      : 0;

    // Issue type breakdown
    const issueBreakdown = {};
    issues?.forEach((issue) => {
      issueBreakdown[issue.type] = (issueBreakdown[issue.type] || 0) + 1;
    });

    // Approval status breakdown
    const approvalBreakdown = {
      total: approvals?.length || 0,
      approved: approvals?.filter((a) => a.status === 'approved' || a.status === 'executed').length || 0,
      rejected: approvals?.filter((a) => a.status === 'rejected').length || 0,
      pending: approvals?.filter((a) => a.status === 'pending').length || 0,
    };

    return success(res, {
      totalWorkflows,
      completedWorkflows,
      awaitingApprovalWorkflows,
      failedWorkflows,
      completionRate: totalWorkflows > 0 ? Math.round((completedWorkflows / totalWorkflows) * 100) : 0,
      avgDurationSeconds,
      issueBreakdown,
      approvalBreakdown,
      policyCount: policies?.length || 0,
    });
  } catch (err) {
    next(err);
  }
};

export const getAgentMetrics = async (req, res, next) => {
  try {
    const roles = ['intake', 'investigation', 'decision', 'execution', 'verification', 'monitoring'];

    const [{ data: tasks }, { data: actions }] = await Promise.all([
      supabase.from('agent_tasks').select('id, agent_role, status, started_at, completed_at'),
      supabase.from('agent_actions').select('id, task_id, tool_name, status'),
    ]);

    const metricsByRole = roles.map((role) => {
      const roleTasks = tasks?.filter((t) => t.agent_role === role) || [];
      const completedTasks = roleTasks.filter((t) => t.status === 'completed').length;
      const failedTasks = roleTasks.filter((t) => t.status === 'failed').length;

      // Match actions to tasks of this role
      const taskIds = new Set(roleTasks.map((t) => t.id));
      const roleActions = actions?.filter((a) => taskIds.has(a.task_id)) || [];

      return {
        role,
        totalTasks: roleTasks.length,
        completedTasks,
        failedTasks,
        actionCount: roleActions.length,
        toolsUsed: [...new Set(roleActions.map((a) => a.tool_name))],
        successRate: roleTasks.length > 0 ? Math.round((completedTasks / roleTasks.length) * 100) : 0,
      };
    });

    return success(res, metricsByRole);
  } catch (err) {
    next(err);
  }
};

export default {
  getOverview,
  getAgentMetrics,
};
