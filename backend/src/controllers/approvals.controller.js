import AgentOrchestrator from '../agents/orchestrator.js';
import { supabase } from '../config/database.js';
import { success, error, paginated } from '../utils/response.js';

export const getApprovals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('approvals').select('*', { count: 'exact' });
    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error: dbErr } = await query
      .order('requested_at', { ascending: false })
      .range(from, to);

    if (dbErr) throw dbErr;

    return paginated(res, data || [], count || 0, page, limit);
  } catch (err) {
    next(err);
  }
};

export const approveAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;

    const result = await AgentOrchestrator.handleAdminApproval({
      approvalId: id,
      adminUserId,
      approved: true,
    });

    return success(res, result, 200);
  } catch (err) {
    if (err.statusCode === 409) {
      return error(res, err.message, 409);
    }
    next(err);
  }
};

export const rejectAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;
    const { reason } = req.body;

    const result = await AgentOrchestrator.handleAdminApproval({
      approvalId: id,
      adminUserId,
      approved: false,
      rejectionReason: reason || 'Rejected by Administrator',
    });

    return success(res, result, 200);
  } catch (err) {
    if (err.statusCode === 409) {
      return error(res, err.message, 409);
    }
    next(err);
  }
};

export default {
  getApprovals,
  approveAction,
  rejectAction,
};
