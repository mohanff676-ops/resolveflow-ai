import { supabase } from '../config/database.js';
import { success, error, paginated } from '../utils/response.js';

export const getIssues = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, priority, type, search } = req.query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('issues').select('*, customer:customers(id, name, email), order:orders(id, order_number, total_amount, status)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (type) query = query.eq('type', type);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,issue_number.ilike.%${search}%`);
    }

    const { data, count, error: dbErr } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (dbErr) throw dbErr;

    return paginated(res, data || [], count || 0, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getIssueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: issue, error: issueErr } = await supabase
      .from('issues')
      .select('*, customer:customers(*), order:orders(*)')
      .eq('id', id)
      .maybeSingle();

    if (issueErr) throw issueErr;
    if (!issue) {
      return error(res, 'Issue not found', 404);
    }

    // Get linked workflows
    const { data: workflows } = await supabase
      .from('workflows')
      .select('id, status, started_at, completed_at, trigger_message')
      .eq('issue_id', id)
      .order('started_at', { ascending: false });

    return success(res, {
      ...issue,
      workflows: workflows || [],
    });
  } catch (err) {
    next(err);
  }
};

export const createIssue = async (req, res, next) => {
  try {
    const { title, description, type, priority, order_id, customer_id } = req.body;
    const userId = req.user?.id || null;

    const issueNumber = `ISS-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: issue, error: dbErr } = await supabase
      .from('issues')
      .insert({
        issue_number: issueNumber,
        title,
        description,
        type: type || 'general_inquiry',
        priority: priority || 'medium',
        order_id: order_id || null,
        customer_id: customer_id || null,
        status: 'open',
        assigned_to: userId,
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    // Record audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'ISSUE_CREATED',
      entity_type: 'issues',
      entity_id: issue.id,
      metadata: { issue_number: issue.issue_number, type: issue.type, priority: issue.priority },
    });

    return success(res, issue, 201);
  } catch (err) {
    next(err);
  }
};

export const updateIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, resolution, assigned_to } = req.body;
    const userId = req.user?.id || null;

    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (resolution !== undefined) updates.resolution = resolution;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;

    const { data: updatedIssue, error: dbErr } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (dbErr) throw dbErr;
    if (!updatedIssue) {
      return error(res, 'Issue not found', 404);
    }

    // Record audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'ISSUE_UPDATED',
      entity_type: 'issues',
      entity_id: id,
      metadata: updates,
    });

    return success(res, updatedIssue, 200);
  } catch (err) {
    next(err);
  }
};

export default {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
};
