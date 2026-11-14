import { supabase } from '../config/database.js';
import { success } from '../utils/response.js';

export const getStats = async (req, res, next) => {
  try {
    // Run parallel count queries
    const [
      { count: totalIssues },
      { count: resolvedIssues },
      { count: activeWorkflows },
      { count: pendingApprovals },
      { count: totalOrders },
      { count: totalWorkflows },
      { count: completedWorkflows },
    ] = await Promise.all([
      supabase.from('issues').select('*', { count: 'exact', head: true }),
      supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('workflows').select('*', { count: 'exact', head: true }).in('status', ['running', 'awaiting_approval']),
      supabase.from('approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('workflows').select('*', { count: 'exact', head: true }),
      supabase.from('workflows').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);

    const successRate = totalWorkflows && totalWorkflows > 0
      ? Math.round((completedWorkflows / totalWorkflows) * 100)
      : 0;

    return success(res, {
      totalIssues: totalIssues || 0,
      resolvedIssues: resolvedIssues || 0,
      activeWorkflows: activeWorkflows || 0,
      pendingApprovals: pendingApprovals || 0,
      totalOrders: totalOrders || 0,
      totalWorkflows: totalWorkflows || 0,
      completedWorkflows: completedWorkflows || 0,
      successRate,
    });
  } catch (err) {
    next(err);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const [
      { data: recentActions },
      { data: recentWorkflows },
      { data: recentAuditLogs },
    ] = await Promise.all([
      supabase
        .from('agent_actions')
        .select('*, task:agent_tasks(agent_role)')
        .order('executed_at', { ascending: false })
        .limit(15),
      supabase
        .from('workflows')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5),
      supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return success(res, {
      recentActions: recentActions || [],
      recentWorkflows: recentWorkflows || [],
      recentAuditLogs: recentAuditLogs || [],
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getStats,
  getActivity,
};
