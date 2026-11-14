import * as ticketService from '../services/ticket.service.js';
import { supabase } from '../config/database.js';
import { success, error, paginated } from '../utils/response.js';

export const createTicket = async (req, res, next) => {
  try {
    const { customer_name, customer_email, order_id, category, description } = req.body;
    const userId = req.user?.id || null;

    const result = await ticketService.createTicket({
      customer_name,
      customer_email,
      order_id,
      category,
      description,
      userId,
    });

    return success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const getTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const email = req.query.email || req.headers['x-customer-email'] || req.body?.email;

    if (!email) {
      return error(res, 'Customer email is required for ownership verification.', 400);
    }

    const ticket = await ticketService.getTicketByPublicId(ticketId, email);
    return success(res, ticket, 200);
  } catch (err) {
    if (err.statusCode) {
      return error(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const getTicketProgress = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const email = req.query.email || req.headers['x-customer-email'] || req.body?.email;

    if (!email) {
      return error(res, 'Customer email is required for ownership verification.', 400);
    }

    const progress = await ticketService.getTicketProgress(ticketId, email);
    return success(res, progress, 200);
  } catch (err) {
    if (err.statusCode) {
      return error(res, err.message, err.statusCode);
    }
    next(err);
  }
};

/**
 * Employee dashboard endpoint to view all tickets
 */
export const getAllTickets = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search;
    const status = req.query.status;
    const priority = req.query.priority;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('issues')
      .select('*, customer:customers(name, email), order:orders(order_number)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (search) {
      query = query.or(`issue_number.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`);
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

export default {
  createTicket,
  getTicket,
  getTicketProgress,
  getAllTickets,
};
