import api from './api.js';

export const orderService = {
  // Get paginated orders
  async getOrders({ page = 1, limit = 10, status = '', search = '' } = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await api.get('/orders', { params });
    return response.data;
  },

  // Get order by UUID or order_number (e.g. ORD-1003)
  async getOrderById(id) {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
};

export default orderService;
