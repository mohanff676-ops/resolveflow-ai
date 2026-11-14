import { supabase } from '../config/database.js';
import { success, error, paginated } from '../utils/response.js';

export const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, search } = req.query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('orders')
      .select('*, customer:customers(id, name, email, phone)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.ilike('order_number', `%${search}%`);
    }

    const { data, count, error: dbErr } = await query
      .order('order_date', { ascending: false })
      .range(from, to);

    if (dbErr) throw dbErr;

    return paginated(res, data || [], count || 0, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if ID is UUID or order_number (e.g. ORD-1003)
    let query = supabase.from('orders').select('*, customer:customers(*)');
    if (id.includes('-') && id.startsWith('ORD-')) {
      query = query.eq('order_number', id);
    } else {
      query = query.eq('id', id);
    }

    const { data: order, error: orderErr } = await query.maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) {
      return error(res, 'Order not found', 404);
    }

    // Retrieve order items with product details
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('order_id', order.id);

    if (itemsErr) throw itemsErr;

    // Retrieve any linked issues
    const { data: issues } = await supabase
      .from('issues')
      .select('id, issue_number, title, type, priority, status, created_at')
      .eq('order_id', order.id);

    return success(res, {
      ...order,
      items: items || [],
      issues: issues || [],
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getOrders,
  getOrderById,
};
