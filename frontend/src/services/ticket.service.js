import api from './api.js';

export const ticketService = {
  /**
   * Submit a new support ticket
   */
  async createTicket(ticketData) {
    const res = await api.post('/tickets', ticketData);
    return res.data;
  },

  /**
   * Customer-safe ticket information lookup (requires email verification)
   */
  async getTicket(ticketId, email) {
    const res = await api.get(`/tickets/${encodeURIComponent(ticketId)}`, {
      params: { email },
    });
    return res.data;
  },

  /**
   * Customer-safe 7-step progress timeline (requires email verification)
   */
  async getTicketProgress(ticketId, email) {
    const res = await api.get(`/tickets/${encodeURIComponent(ticketId)}/progress`, {
      params: { email },
    });
    return res.data;
  },

  /**
   * Employee/Admin listing of all tickets
   */
  async getAllTickets(params = {}) {
    const res = await api.get('/tickets', { params });
    return res.data;
  },
};

export default ticketService;
