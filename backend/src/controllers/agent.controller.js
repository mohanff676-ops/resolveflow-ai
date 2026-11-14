import AgentOrchestrator from '../agents/orchestrator.js';
import { supabase } from '../config/database.js';
import { success, error, paginated } from '../utils/response.js';

export const runAgent = async (req, res, next) => {
  try {
    const { message, issue_id, mode } = req.body;
    const userId = req.user?.id || null;

    if (mode === 'interactive') {
      const result = await AgentOrchestrator.runInteractiveAgentLoop({
        message,
      });
      return success(res, result, 200);
    }

    const result = await AgentOrchestrator.runWorkflow({
      message,
      userId,
      issueId: issue_id,
    });

    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

export const getWorkflows = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('workflows').select('*', { count: 'exact' });
    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error: dbErr } = await query
      .order('started_at', { ascending: false })
      .range(from, to);

    if (dbErr) throw dbErr;

    return paginated(res, data || [], count || 0, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getWorkflowById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: workflow, error: wfErr } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (wfErr) throw wfErr;
    if (!workflow) {
      return error(res, 'Workflow not found', 404);
    }

    // Get associated agent tasks
    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('workflow_id', id)
      .order('started_at', { ascending: true });

    // Get associated agent actions
    const { data: actions } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('workflow_id', id)
      .order('executed_at', { ascending: true });

    // Get associated approvals
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('workflow_id', id);

    return success(res, {
      ...workflow,
      tasks: tasks || [],
      actions: actions || [],
      approvals: approvals || [],
    });
  } catch (err) {
    next(err);
  }
};

export const getWorkflowActions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: actions, error: actErr } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('workflow_id', id)
      .order('executed_at', { ascending: true });

    if (actErr) throw actErr;

    return success(res, actions || []);
  } catch (err) {
    next(err);
  }
};

export default {
  runAgent,
  getWorkflows,
  getWorkflowById,
  getWorkflowActions,
};
